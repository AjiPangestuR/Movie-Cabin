'use client';

import React, { useState, useMemo } from 'react';
import { Movie, StatusFilter, SortOption } from '@/types';
import { MoodChips } from '@/components/MoodChips';
import { MovieCard } from '@/components/MovieCard';
import { EmptyState } from '@/components/EmptyState';

const STATUS_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'Semua Film' },
  { key: 'no', label: 'Belum Ditonton' },
  { key: 'yes', label: 'Sudah Ditonton' },
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
    setSort('new');
  };

  const stats = useMemo(() => {
    const total = movies.length;
    const watched = movies.filter((m) => m.done).length;
    const unwatched = total - watched;
    return { total, watched, unwatched };
  }, [movies]);

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

  const isFiltered = search.trim().length > 0 || selectedMoods.length > 0 || status !== 'all';

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Editorial Header */}
      <section className="border-b border-line/60 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs font-mono tracking-widest uppercase text-muted/70">
              <span>The Film Library</span>
              <span className="text-muted/30">/</span>
              <span>Koleksi Lengkap</span>
            </div>
            <h1 className="font-serif font-bold text-3xl sm:text-4xl text-text tracking-tight">
              Movie Bank
            </h1>
            <p className="text-muted text-sm mt-1">
              Perpustakaan film pribadi Beruang Sastra untuk riset sinema dan ide konten.
            </p>
          </div>

          {/* Quick Collection Ledger / Stats */}
          <div className="flex items-center gap-3 text-xs font-mono text-muted/80 self-start sm:self-auto bg-surface/60 px-3.5 py-2 rounded-lg border border-line-subtle">
            <div>
              <span className="text-text font-semibold">{stats.total}</span> Total
            </div>
            <span className="text-line">|</span>
            <div>
              <span className="text-text-subtle font-semibold">{stats.unwatched}</span> Belum
            </div>
            <span className="text-line">|</span>
            <div>
              <span className="text-ok font-semibold">{stats.watched}</span> Selesai
            </div>
          </div>
        </div>
      </section>

      {/* Filter and Search Controls */}
      <section className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
            <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-[2]" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <input
            type="text"
            id="q"
            placeholder="Cari berdasarkan judul film..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Cari judul film"
            className="pl-10 pr-11 py-2.5 bg-surface border border-line rounded-lg text-sm text-text placeholder:text-muted/60 focus:border-accent focus:bg-surface-elevated transition-all w-full"
          />
          {search && (
            <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center">
              <button
                type="button"
                onClick={() => setSearch('')}
                className="w-7 h-7 rounded flex items-center justify-center text-muted hover:text-text hover:bg-surface-elevated cursor-pointer transition-colors"
                aria-label="Hapus kata kunci pencarian"
                title="Hapus pencarian"
              >
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
                  <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Mood Chips Row */}
        {availableMoods.length > 0 && (
          <div>
            <div className="text-[11px] uppercase font-mono tracking-wider text-muted mb-1.5">
              Filter Mood
            </div>
            <MoodChips
              moods={availableMoods}
              selectedMoods={selectedMoods}
              onToggle={handleToggleMood}
            />
          </div>
        )}

        {/* Status Pills and Sorting Dropdown */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          {/* Status Options */}
          <div className="flex gap-1.5 overflow-x-auto py-1 [scrollbar-width:none]">
            {STATUS_OPTIONS.map((opt) => {
              const active = status === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setStatus(opt.key)}
                  className={`flex-none px-3.5 py-1.5 rounded-full border text-xs sm:text-[13px] transition-all duration-150 cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-accent ${
                    active
                      ? 'bg-accent/15 border-accent text-text font-medium shadow-xs shadow-accent/20'
                      : 'bg-surface/60 border-line text-muted hover:border-line-subtle hover:text-text hover:bg-surface-elevated'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Sort Control */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <label htmlFor="sort" className="!m-0 text-xs text-muted whitespace-nowrap">
              Urutkan:
            </label>
            <select
              id="sort"
              aria-label="Urutkan film"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="py-1.5 px-3 bg-surface border border-line rounded-lg text-xs sm:text-sm text-text cursor-pointer focus:border-accent w-auto"
            >
              <option value="new">Terbaru Ditambahkan</option>
              <option value="title">Judul (A-Z)</option>
              <option value="pot">Potensi Konten Tertinggi</option>
            </select>
          </div>
        </div>

        {/* Filter Feedback and Reset */}
        {isFiltered && (
          <div className="flex items-center justify-between text-xs text-muted pt-2 border-t border-line/40">
            <span>
              Menampilkan <strong className="text-text">{filteredMovies.length}</strong> dari {movies.length} film
            </span>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-accent hover:underline cursor-pointer"
            >
              Reset semua filter
            </button>
          </div>
        )}
      </section>

      {/* Grid or Empty State */}
      <section>
        {filteredMovies.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredMovies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        ) : movies.length === 0 ? (
          <EmptyState
            title="Belum ada film di perpustakaan."
            description="Tambahkan film favorit atau daftar tontonan lu untuk memulai riset film."
            actionText="Tambah film baru"
            actionHref="/add"
            primaryAction
          />
        ) : (
          <EmptyState
            title="Nggak ada film yang cocok."
            description="Coba ubah kata kunci pencarian atau lepaskan filter yang sedang aktif."
            actionText="Lepas semua filter"
            onAction={handleResetFilters}
          />
        )}
      </section>
    </div>
  );
}
