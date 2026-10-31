'use client';

import React, { useState, useMemo } from 'react';
import { Movie, StatusFilter, SortOption } from '@/types';
import { MoodChips } from '@/components/MoodChips';
import { MovieCard } from '@/components/MovieCard';
import { EmptyState } from '@/components/EmptyState';
import { Badge } from '@/components/Badge';
import { FilmStripDivider } from '@/components/FilmStripDivider';

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

  const isFiltered = search.trim().length > 0 || selectedMoods.length > 0 || status !== 'all' || sort !== 'new';

  return (
    <div className="space-y-8 sm:space-y-10 pb-8">
      {/* ─────────────────────────────────────────────────────────────
          EDITORIAL HEADER (Retro VHS Library Shelf)
         ───────────────────────────────────────────────────────────── */}
      <section className="border-b border-line/60 pb-6 sm:pb-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            {/* OSD Status Bar */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Badge variant="movie" size="xs">
                LIBRARY CATALOG
              </Badge>
              <span className="text-[10px] font-pixel text-muted tracking-wider uppercase">
                MOCAB TAPE RACK
              </span>
              <span className="text-[10px] font-pixel text-muted/60 tracking-wider ml-auto hidden sm:inline" aria-hidden="true">
                SP 120 MIN // VOL. 01
              </span>
            </div>

            <h1 className="font-serif font-bold text-3xl sm:text-4xl text-text tracking-tight">
              Movie Bank
            </h1>
            <p className="text-muted text-sm sm:text-base mt-2 max-w-xl leading-relaxed">
              Perpustakaan film pribadi Beruang Sastra. Jelajahi rak koleksi, saring status tontonan,
              atau temukan film berikutnya berdasarkan mood dan potensi konten.
            </p>
          </div>

          {/* Quick Collection Ledger / Stats Strip */}
          <div className="flex items-center gap-3 text-xs self-start lg:self-auto bg-surface/80 p-2 sm:p-2.5 rounded-xl border border-line shadow-xs">
            <div className="px-3 py-1 rounded-lg bg-surface-elevated/70">
              <span className="font-serif font-bold text-base text-text block leading-none">{stats.total}</span>
              <span className="text-[9px] font-pixel text-muted uppercase">Total</span>
            </div>
            <div className="px-3 py-1 rounded-lg bg-primary/10 border border-primary/20">
              <span className="font-serif font-bold text-base text-primary-bright block leading-none">{stats.unwatched}</span>
              <span className="text-[9px] font-pixel text-primary-bright uppercase">Watchlist</span>
            </div>
            <div className="px-3 py-1 rounded-lg bg-ok/10 border border-ok/20">
              <span className="font-serif font-bold text-base text-ok block leading-none">{stats.watched}</span>
              <span className="text-[9px] font-pixel text-ok uppercase">Selesai</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SEARCH & FILTER CONTROLS
         ───────────────────────────────────────────────────────────── */}
      <section className="card p-5 sm:p-6 space-y-5">
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
            <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-[2]" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <input
            type="search"
            id="q"
            placeholder="Cari berdasarkan judul film..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Cari judul film di Movie Bank"
            className="pl-10 pr-11 py-2.5 bg-bg/70 border border-line rounded-xl text-sm text-text placeholder:text-muted/60 focus:border-primary-bright focus:bg-surface-elevated transition-all w-full"
          />
          {search && (
            <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center">
              <button
                type="button"
                onClick={() => setSearch('')}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-text hover:bg-surface-elevated cursor-pointer transition-colors"
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
          <div className="pt-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-pixel uppercase tracking-wider text-muted">
                FILTER MOOD ({selectedMoods.length ? `${selectedMoods.length} AKTIF` : 'SEMUA'})
              </span>
              {selectedMoods.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedMoods([])}
                  className="text-xs text-neon-magenta hover:underline cursor-pointer"
                >
                  Reset Mood
                </button>
              )}
            </div>
            <MoodChips
              moods={availableMoods}
              selectedMoods={selectedMoods}
              onToggle={handleToggleMood}
              wrap
            />
          </div>
        )}

        {/* Status Pills and Sorting Dropdown */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-line/50">
          {/* Status Options */}
          <div className="flex gap-2 overflow-x-auto py-1 [scrollbar-width:none]">
            {STATUS_OPTIONS.map((opt) => {
              const active = status === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setStatus(opt.key)}
                  aria-pressed={active}
                  className={`flex-none px-3.5 py-1.5 rounded-xl border text-xs sm:text-[13px] transition-all duration-150 cursor-pointer select-none focus-visible:outline-2 focus-visible:outline-primary ${
                    active
                      ? 'bg-neon-magenta/15 border-neon-magenta/40 text-neon-magenta font-semibold shadow-xs shadow-neon-magenta/15'
                      : 'bg-surface/80 border-line text-muted hover:border-line-subtle hover:text-text hover:bg-surface-elevated'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <label htmlFor="sort" className="!m-0 text-xs font-pixel text-muted uppercase whitespace-nowrap">
              URUTKAN:
            </label>
            <select
              id="sort"
              aria-label="Urutkan koleksi film"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="py-1.5 px-3 bg-surface border border-line rounded-xl text-xs sm:text-sm text-text cursor-pointer focus:border-primary-bright focus:outline-none w-auto"
            >
              <option value="new">Terbaru Ditambahkan</option>
              <option value="title">Judul (A-Z)</option>
              <option value="pot">Potensi Konten Tertinggi</option>
            </select>
          </div>
        </div>

        {/* Filter Feedback and Reset Row */}
        {isFiltered && (
          <div className="flex items-center justify-between text-xs text-muted pt-3 border-t border-line/40">
            <span>
              Menampilkan <strong className="text-text font-bold">{filteredMovies.length}</strong> dari {movies.length} film
            </span>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-semibold text-neon-magenta hover:underline cursor-pointer"
            >
              Reset semua filter
            </button>
          </div>
        )}
      </section>

      {/* Film Strip Divider */}
      <FilmStripDivider label="TAPE SHELF // ALL TITLES" />

      {/* ─────────────────────────────────────────────────────────────
          MOVIE GRID (5-6 cols Desktop, 3-4 cols Tablet, 2 cols Mobile)
         ───────────────────────────────────────────────────────────── */}
      <section aria-label="Daftar Koleksi Film">
        {filteredMovies.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
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
