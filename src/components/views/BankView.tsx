'use client';

import React, { useState, useMemo } from 'react';
import { Movie, StatusFilter, SortOption } from '@/types';
import { MoodChips } from '@/components/MoodChips';
import { MovieCard } from '@/components/MovieCard';
import { EmptyState } from '@/components/EmptyState';

const STATUS_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'Semua' },
  { key: 'no', label: 'Belum ditonton' },
  { key: 'yes', label: 'Sudah ditonton' },
];

interface BankViewProps {
  initialMovies?: Movie[];
  initialMoods?: string[];
}

export function BankView({ initialMovies = [], initialMoods = [] }: BankViewProps) {
  const [movies] = useState<Movie[]>(initialMovies);
  const [availableMoods] = useState<string[]>(initialMoods);

  const [search, setSearch] = useState('');
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortOption>('new');

  const handleToggleMood = (mood: string) => {
    setSelectedMoods((prev) =>
      prev.includes(mood) ? prev.filter((m) => m !== mood) : [...prev, mood]
    );
  };

  const handleResetFilters = () => {
    setSelectedMoods([]);
    setStatus('all');
    setSearch('');
  };

  const filteredMovies = useMemo(() => {
    const q = search.trim().toLowerCase();

    const filtered = movies.filter((m) => {
      // Mood match
      const matchMood =
        selectedMoods.length === 0 || m.moods.some((mood) => selectedMoods.includes(mood));

      // Status match
      const matchStatus =
        status === 'all' || (status === 'yes' ? m.done : !m.done);

      // Search match
      const matchQuery = !q || m.title.toLowerCase().includes(q);

      return matchMood && matchStatus && matchQuery;
    });

    // Sorting
    filtered.sort((a, b) => {
      if (sort === 'title') {
        return a.title.localeCompare(b.title);
      }
      if (sort === 'pot') {
        const pA = a.log?.contentPotential || 0;
        const pB = b.log?.contentPotential || 0;
        return pB - pA;
      }
      // 'new': already ordered by created_at desc from database
      return 0;
    });

    return filtered;
  }, [movies, search, selectedMoods, status, sort]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1>Movie Bank</h1>
          <p className="muted">{movies.length} film tersimpan</p>
        </div>
      </div>

      {/* Search Bar */}
      <input
        type="text"
        id="q"
        placeholder="Cari judul"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Cari judul"
        className="mt-4"
      />

      {/* Mood Filters dari database */}
      {availableMoods.length > 0 && (
        <div className="mt-2.5">
          <MoodChips
            moods={availableMoods}
            selectedMoods={selectedMoods}
            onToggle={handleToggleMood}
          />
        </div>
      )}

      {/* Status Chips and Sort Filter */}
      <div className="flex items-center justify-between gap-3 flex-wrap mt-2">
        <div className="flex gap-2 overflow-x-auto py-1 [scrollbar-width:none]">
          {STATUS_OPTIONS.map((opt) => {
            const active = status === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setStatus(opt.key)}
                className={`flex-none px-3.5 py-[7px] rounded-full border text-sm transition-colors cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-accent ${
                  active
                    ? 'bg-accent-soft border-accent text-text font-medium'
                    : 'bg-transparent border-line text-muted hover:border-accent/40'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <select
          id="sort"
          aria-label="Urutkan"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="w-auto cursor-pointer"
        >
          <option value="new">Terbaru</option>
          <option value="title">Judul A-Z</option>
          <option value="pot">Potensi tertinggi</option>
        </select>
      </div>

      {/* Grid or Empty State */}
      {filteredMovies.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 min-[860px]:grid-cols-4 gap-4 mt-3.5">
          {filteredMovies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Nggak ada yang cocok."
          description="Ubah kata kunci atau lepas filter."
          actionText="Lepas semua filter"
          onAction={handleResetFilters}
        />
      )}
    </div>
  );
}
