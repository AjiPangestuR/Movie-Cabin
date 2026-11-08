'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { type Movie } from '@/types';

interface MovieAttachmentDrawerProps {
  availableMovies: Movie[];
  selectedMovieId: string | null;
  resonanceNote: string;
  onSelectMovie: (movieId: string | null) => void;
  onChangeResonanceNote: (note: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function MovieAttachmentDrawer({
  availableMovies = [],
  selectedMovieId,
  resonanceNote,
  onSelectMovie,
  onChangeResonanceNote,
  isOpen,
  onToggle,
}: MovieAttachmentDrawerProps) {
  const [search, setSearch] = useState('');

  const selectedMovie = useMemo(() => {
    if (!selectedMovieId) return null;
    return availableMovies.find((m) => m.id === selectedMovieId) || null;
  }, [availableMovies, selectedMovieId]);

  const filteredMovies = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return availableMovies.slice(0, 10);
    return availableMovies
      .filter((m) => m.title.toLowerCase().includes(q))
      .slice(0, 15);
  }, [availableMovies, search]);

  return (
    <div className="rounded-xl border border-line bg-surface/50 overflow-hidden transition-all duration-200">
      {/* ─────────────────────────────────────────────────────────────
          DRAWER TRIGGER HEADER
         ───────────────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-surface-elevated/40 transition-colors cursor-pointer select-none"
      >
        <div className="flex items-center gap-2.5">
          <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-2 text-primary-bright" aria-hidden="true">
            <rect x="2" y="2" width="20" height="20" rx="2" />
            <line x1="7" y1="2" x2="7" y2="22" />
            <line x1="17" y1="2" x2="17" y2="22" />
            <line x1="2" y1="12" x2="22" y2="12" />
          </svg>
          <span className="text-xs sm:text-sm font-medium text-text">
            Tautkan Film & Resonansi Batin
          </span>
          {selectedMovie && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-pixel bg-primary/20 text-primary-bright border border-primary/30">
              1 FILM TERTAUT
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted">
            {isOpen ? 'Tutup Panel' : selectedMovie ? selectedMovie.title : 'Pilih Film'}
          </span>
          <svg
            viewBox="0 0 16 16"
            className={`w-3.5 h-3.5 fill-current text-muted transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
            aria-hidden="true"
          >
            <path d="M4.427 7.427l3.396 3.396a.25.25 0 0 0 .354 0l3.396-3.396A.25.25 0 0 0 11.396 7H4.604a.25.25 0 0 0-.177.427z" />
          </svg>
        </div>
      </button>

      {/* ─────────────────────────────────────────────────────────────
          EXPANDABLE DRAWER CONTENT
         ───────────────────────────────────────────────────────────── */}
      {isOpen && (
        <div className="p-4 border-t border-line/60 space-y-4 bg-surface/70">
          {/* Active Attached Movie Preview */}
          {selectedMovie ? (
            <div className="flex items-start justify-between gap-3 p-3 rounded-xl border border-primary/40 bg-primary/5">
              <div className="flex items-center gap-3">
                {selectedMovie.posterPath ? (
                  <div className="relative w-12 h-16 rounded-md overflow-hidden bg-surface border border-line flex-none">
                    <Image
                      src={`https://image.tmdb.org/t/p/w92${selectedMovie.posterPath}`}
                      alt={selectedMovie.title}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-16 rounded-md bg-surface-elevated border border-line flex items-center justify-center text-primary text-xs flex-none">
                    FILM
                  </div>
                )}
                <div>
                  <h4 className="font-serif font-bold text-sm sm:text-base text-text">
                    {selectedMovie.title}
                  </h4>
                  <p className="text-xs text-muted">
                    {selectedMovie.year} • {selectedMovie.runtime} menit
                  </p>
                  <p className="text-[11px] text-primary-bright font-pixel mt-1">
                    TERTAUT KE JURNAL INI
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSelectMovie(null)}
                className="px-2.5 py-1 rounded-md text-xs font-medium text-danger border border-danger/30 hover:bg-danger/10 transition-colors cursor-pointer"
                title="Lepas Tautan Film"
              >
                Lepas Film
              </button>
            </div>
          ) : (
            <div>
              <label htmlFor="journal-movie-search" className="block text-xs font-medium text-muted mb-1.5">
                Cari Film dari Movie Bank Kamu
              </label>
              <div className="relative">
                <input
                  id="journal-movie-search"
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Ketik judul film yang ingin ditautkan..."
                  className="w-full px-3.5 py-2 rounded-lg border border-line bg-surface text-text text-xs sm:text-sm placeholder:text-muted/60 focus:outline-hidden focus:border-primary/60 transition-colors"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-text text-xs"
                  >
                    Batal
                  </button>
                )}
              </div>

              {/* Movie Search Results Dropdown/List */}
              <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-line bg-surface divide-y divide-line/40">
                {filteredMovies.length === 0 ? (
                  <div className="p-3 text-center text-xs text-muted">
                    Tidak ada film yang cocok dengan &quot;{search}&quot;.
                  </div>
                ) : (
                  filteredMovies.map((movie) => (
                    <button
                      key={movie.id}
                      type="button"
                      onClick={() => {
                        onSelectMovie(movie.id);
                        setSearch('');
                      }}
                      className="w-full p-2.5 flex items-center justify-between text-left hover:bg-surface-elevated transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-medium text-text">
                          {movie.title}
                        </span>
                        <span className="text-[11px] text-muted">
                          ({movie.year})
                        </span>
                      </div>
                      <span className="text-[11px] text-primary-bright font-medium">
                        + Tautkan
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Resonance Note Textarea (Active when a movie is selected) */}
          {selectedMovie && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="journal-resonance-note"
                  className="block text-xs font-medium text-text-subtle"
                >
                  Catatan Resonansi Batin (Opsional)
                </label>
                <span className="text-[10px] text-muted">
                  {resonanceNote.length}/500 karakter
                </span>
              </div>
              <textarea
                id="journal-resonance-note"
                rows={2}
                maxLength={500}
                value={resonanceNote}
                onChange={(e) => onChangeResonanceNote(e.target.value)}
                placeholder="Bagaimana adegan atau rasa dari film ini bergema dengan apa yang kamu rasakan hari ini?"
                className="w-full px-3 py-2 rounded-lg border border-line bg-surface text-text text-xs sm:text-sm placeholder:text-muted/60 focus:outline-hidden focus:border-primary/60 transition-colors resize-none leading-relaxed"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
