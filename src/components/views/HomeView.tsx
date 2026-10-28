'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
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

interface HomeViewProps {
  initialMovies?: Movie[];
  initialMoods?: string[];
}

export function HomeView({ initialMovies = [], initialMoods = [] }: HomeViewProps) {
  const [movies] = useState<Movie[]>(initialMovies);
  const [availableMoods] = useState<string[]>(initialMoods);
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
    if (shuffleKey < 0) return [];
    return shuffleArray(unwatchedCandidates).slice(0, 3);
  }, [unwatchedCandidates, shuffleKey]);

  const hasMoodFilter = selectedMoods.length > 0;
  const totalUnwatched = useMemo(() => movies.filter((m) => !m.done).length, [movies]);

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* Editorial Page Header */}
      <section className="border-b border-line/60 pb-6 sm:pb-8">
        <div className="flex items-center gap-2 mb-2 text-xs font-mono tracking-widest uppercase text-muted/70">
          <span>The Screening Room</span>
          <span className="text-muted/30">/</span>
          <span>Kurasi Malam</span>
        </div>
        <h1 className="font-serif font-bold text-3xl sm:text-4xl text-text tracking-tight max-w-xl">
          Mau nonton apa malam ini?
        </h1>
        <p className="text-muted text-sm sm:text-base mt-2 max-w-lg leading-relaxed">
          Pilih suasana hati untuk menyaring rekomendasi, atau biarkan Kabin mengacak dari {totalUnwatched} film yang belum lu tonton.
        </p>

        {/* Mood Filter Strip */}
        {availableMoods.length > 0 && (
          <div className="mt-6 pt-5 border-t border-line/40">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-medium uppercase tracking-wider text-muted">
                Filter Mood
              </span>
              {hasMoodFilter && (
                <button
                  type="button"
                  onClick={() => setSelectedMoods([])}
                  className="text-xs text-muted hover:text-accent transition-colors cursor-pointer"
                >
                  Lepas filter ({selectedMoods.length})
                </button>
              )}
            </div>
            <MoodChips
              moods={availableMoods}
              selectedMoods={selectedMoods}
              onToggle={handleToggleMood}
            />
          </div>
        )}
      </section>

      {/* Recommended Section (Curated Triple-Bill) */}
      <section>
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-baseline gap-2.5">
            <h2 className="font-serif font-semibold text-xl sm:text-2xl text-text tracking-tight">
              Pilihan malam ini
            </h2>
            {picks.length > 0 && (
              <span className="text-xs font-mono text-muted/80">
                ({picks.length} rekomendasi)
              </span>
            )}
          </div>

          {unwatchedCandidates.length > 1 && (
            <button
              type="button"
              onClick={handleShuffle}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line bg-surface/80 hover:bg-surface-elevated text-xs font-medium text-text hover:text-accent hover:border-accent/40 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-accent"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-3.5 h-3.5 stroke-current fill-none stroke-[2]"
                aria-hidden="true"
              >
                <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
              </svg>
              <span>Acak lagi</span>
            </button>
          )}
        </div>

        {/* Grid or Empty State */}
        {picks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-6">
            {picks.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        ) : movies.length === 0 ? (
          <EmptyState
            title="Kabin film masih kosong."
            description="Mulai simpan film pertama lu ke dalam perpustakaan untuk memunculkan rekomendasi di sini."
            actionText="Tambah film baru"
            actionHref="/add"
            primaryAction
          />
        ) : (
          <EmptyState
            title={`Nggak ada film ${hasMoodFilter ? 'dengan mood tersebut ' : ''}yang belum ditonton.`}
            description="Coba pilih kombinasi mood lain, atau simpan film baru ke dalam perpustakaan."
            actionText="Tambah film baru"
            actionHref="/add"
          />
        )}
      </section>

      {/* Library Banner Callout */}
      {movies.length > 0 && (
        <section className="rounded-xl border border-line bg-surface/40 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:border-line-subtle">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-muted/70">
              The Film Library
            </span>
            <h3 className="font-serif font-semibold text-lg text-text mt-0.5">
              Kelola seluruh koleksi di Movie Bank
            </h3>
            <p className="text-muted text-xs sm:text-sm mt-1 max-w-md">
              Telusuri {movies.length} film tersimpan dengan pencarian cepat, filter status tontonan, dan pengurutan potensi konten.
            </p>
          </div>
          <Link
            href="/bank"
            className="btn self-start sm:self-center flex-none text-xs sm:text-sm font-medium"
          >
            <span>Buka Movie Bank</span>
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
              <path fillRule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z" />
            </svg>
          </Link>
        </section>
      )}
    </div>
  );
}
