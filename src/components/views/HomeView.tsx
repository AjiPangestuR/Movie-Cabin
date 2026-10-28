'use client';

import React, { useState, useMemo } from 'react';
import { useMovies } from '@/lib/useMovies';
import { Movie } from '@/types';
import { MoodChips } from '@/components/MoodChips';
import { MovieCard } from '@/components/MovieCard';
import { EmptyState } from '@/components/EmptyState';

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function HomeView() {
  const { movies, loading } = useMovies();
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [shuffleKey, setShuffleKey] = useState(0);

  const handleToggleMood = (mood: string) => {
    setSelectedMoods((prev) => {
      const next = prev.includes(mood) ? prev.filter((m) => m !== mood) : [...prev, mood];
      return next;
    });
    setShuffleKey((k) => k + 1);
  };

  const handleShuffle = () => {
    setShuffleKey((k) => k + 1);
  };

  const unwatchedCandidates = useMemo(() => {
    return movies.filter((m) => {
      if (m.done) return false;
      if (selectedMoods.length === 0) return true;
      return m.moods.some((mood) => selectedMoods.includes(mood));
    });
  }, [movies, selectedMoods]);

  const picks: Movie[] = useMemo(() => {
    // shuffleKey dependency triggers a new shuffle
    if (shuffleKey < 0) return [];
    return shuffleArray(unwatchedCandidates).slice(0, 3);
  }, [unwatchedCandidates, shuffleKey]);

  if (loading) {
    return (
      <div>
        <h1>Mau nonton apa malam ini?</h1>
        <p className="muted">Pilih mood, atau langsung acak dari yang belum ditonton.</p>
        <div className="mt-8 text-center text-muted text-sm">Memuat koleksi film...</div>
      </div>
    );
  }

  const hasMoodFilter = selectedMoods.length > 0;

  return (
    <div>
      <h1>Mau nonton apa malam ini?</h1>
      <p className="muted">Pilih mood, atau langsung acak dari yang belum ditonton.</p>

      {/* Mood filter chips */}
      <div className="mt-[18px]">
        <MoodChips
          selectedMoods={selectedMoods}
          onToggle={handleToggleMood}
        />
      </div>

      {/* Section Header */}
      <div className="flex items-center justify-between gap-3 mt-5">
        <h2>Pilihan malam ini</h2>
        <button
          type="button"
          onClick={handleShuffle}
          className="link font-medium"
        >
          Acak lagi
        </button>
      </div>

      {/* Grid or Empty State */}
      {picks.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-3.5">
          {picks.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      ) : movies.length === 0 ? (
        <EmptyState
          title="Kabin masih kosong."
          description="Simpan film pertama lu, nanti muncul di sini."
          actionText="Simpan film"
          actionHref="/add"
          primaryAction
        />
      ) : (
        <EmptyState
          title={`Nggak ada film ${hasMoodFilter ? 'dengan mood itu ' : ''}yang belum ditonton.`}
          description="Coba mood lain, atau tambah film baru."
          actionText="Tambah film"
          actionHref="/add"
        />
      )}
    </div>
  );
}
