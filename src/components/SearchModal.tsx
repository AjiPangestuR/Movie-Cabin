'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Movie } from '@/types';
import { listMovies } from '@/lib/movies';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState('');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Close modal and reset search input
  const handleClose = useCallback(() => {
    setQuery('');
    setSelectedIndex(0);
    onClose();
  }, [onClose]);

  // Load movies from local user library when modal opens
  const fetchLibraryMovies = useCallback(() => {
    Promise.resolve().then(() => {
      setIsLoading(true);
      setError(null);
    });

    listMovies()
      .then((data) => {
        setMovies(data);
        setHasLoaded(true);
        setIsLoading(false);
      })
      .catch(() => {
        setError('Gagal memuat film dari database.');
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    if (isOpen && !hasLoaded) {
      fetchLibraryMovies();
    }
  }, [isOpen, hasLoaded, fetchLibraryMovies]);

  // Autofocus input and handle body scroll lock
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 60);

      return () => {
        clearTimeout(timer);
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Filter movies based on query (title, year, mood)
  const filteredResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Show up to 8 most recent movies from the user library
      return movies.slice(0, 8);
    }
    return movies.filter((m) => {
      const matchTitle = m.title.toLowerCase().includes(q);
      const matchYear = m.year?.toString().includes(q);
      const matchMood = m.moods?.some((mood) => mood.toLowerCase().includes(q));
      return matchTitle || matchYear || matchMood;
    });
  }, [movies, query]);

  // Auto-scroll active item into view
  useEffect(() => {
    const container = listRef.current;
    if (!container) return;
    const activeItem = container.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement;
    if (activeItem) {
      activeItem.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const handleSelectMovie = useCallback(
    (id: string) => {
      handleClose();
      router.push(`/bank/${id}`);
    },
    [handleClose, router]
  );

  // Keyboard navigation within modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleClose();
      return;
    }

    if (filteredResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filteredResults[selectedIndex];
      if (selected) {
        handleSelectMovie(selected.id);
      }
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current) {
      handleClose();
    }
  };

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setSelectedIndex(0);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Pencarian Global Film"
      className="fixed inset-0 z-50 flex items-start justify-center pt-14 sm:pt-20 px-4 pb-6 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div
        className="bg-surface border border-line rounded-2xl shadow-2xl max-w-xl w-full flex flex-col overflow-hidden max-h-[82vh] transition-colors"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-line/80 bg-surface-elevated/40 flex-none">
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5 stroke-current fill-none stroke-[2] text-neon-magenta flex-none"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleQueryChange}
            placeholder="Cari judul, tahun, atau mood film..."
            aria-label="Ketik judul film untuk mencari"
            className="w-full bg-transparent text-text placeholder:text-muted focus:outline-none text-base border-none p-0 focus:ring-0"
          />

          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSelectedIndex(0);
              }}
              aria-label="Hapus kata kunci pencarian"
              className="p-1 rounded-md text-muted hover:text-text hover:bg-surface-elevated transition-colors cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-[2]" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}

          <button
            type="button"
            onClick={handleClose}
            aria-label="Tutup pencarian"
            className="px-2 py-1 rounded text-[11px] font-pixel border border-line bg-surface text-muted hover:text-text hover:border-line-subtle transition-colors cursor-pointer"
          >
            ESC
          </button>
        </div>

        {/* Section Tag */}
        <div className="px-4 py-2 border-b border-line/40 bg-surface/80 flex items-center justify-between text-[11px] font-pixel text-muted flex-none">
          <span>{query.trim() ? `HASIL PENCARIAN (${filteredResults.length})` : 'FILM TERBARU DI KOLEKSI'}</span>
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] text-muted/70">
            <span className="w-1.5 h-1.5 rounded-full bg-neon-magenta animate-pulse" aria-hidden="true" />
            <span>MOCAB RETRO VHS</span>
          </span>
        </div>

        {/* Results List / Content Area */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-1">
          {/* Loading State */}
          {isLoading && !hasLoaded && (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-muted">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-sans">Memuat koleksi film Movie Cabin...</p>
            </div>
          )}

          {/* Error State */}
          {!isLoading && error && (
            <div className="py-10 px-4 text-center">
              <p className="text-xs text-danger mb-3">{error}</p>
              <button
                type="button"
                onClick={fetchLibraryMovies}
                className="px-3 py-1.5 rounded-lg border border-line bg-surface-elevated text-xs font-medium text-text hover:border-primary cursor-pointer"
              >
                Coba Muat Ulang
              </button>
            </div>
          )}

          {/* Empty Results State */}
          {!isLoading && !error && filteredResults.length === 0 && (
            <div className="py-12 px-4 flex flex-col items-center justify-center text-center">
              <div className="relative w-14 h-14 mx-auto mb-3 flex items-center justify-center">
                <div className="w-12 h-12 rounded-xl bg-surface-elevated flex items-center justify-center border border-line">
                  <svg
                    viewBox="0 0 24 24"
                    className="w-6 h-6 stroke-current fill-none stroke-[1.8] text-muted"
                    aria-hidden="true"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                    <path d="M8 11h6" />
                  </svg>
                </div>
                <div
                  className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-lg bg-surface border border-line flex items-center justify-center p-1 shadow-xs aspect-square flex-none"
                  aria-hidden="true"
                >
                  <Image
                    src="/brand/avatar-paw.webp"
                    alt=""
                    width={18}
                    height={18}
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
              <h3 className="font-serif font-bold text-sm text-text mb-1">
                {query.trim() ? 'Tidak Ada Film yang Cocok' : 'Belum Ada Film di Koleksi'}
              </h3>
              <p className="text-xs text-muted max-w-xs leading-relaxed">
                {query.trim()
                  ? `Tidak menemukan film dengan kata kunci "${query}". Coba periksa ejaan atau gunakan nama mood.`
                  : 'Koleksi Movie Cabin lu masih kosong. Tambahkan film pertamamu untuk mulai membangun perpustakaan.'}
              </p>
            </div>
          )}

          {/* Results List */}
          {!isLoading &&
            filteredResults.map((movie, index) => {
              const isSelected = index === selectedIndex;

              return (
                <div
                  key={movie.id}
                  data-index={index}
                  onClick={() => handleSelectMovie(movie.id)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`group flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-neon-magenta/10 border-neon-magenta/40 shadow-xs'
                      : 'border-transparent hover:bg-surface-elevated/60'
                  }`}
                >
                  {/* Poster Thumbnail */}
                  <div className="relative w-10 h-14 rounded-md overflow-hidden bg-surface-elevated border border-line/60 flex-none flex items-center justify-center">
                    {movie.posterUrl ? (
                      <Image
                        src={movie.posterUrl}
                        alt={movie.title}
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-1 text-center bg-surface-elevated">
                        <span className="font-pixel text-[9px] text-muted font-bold">VHS</span>
                      </div>
                    )}
                  </div>

                  {/* Title & Metadata */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4
                        className={`font-serif font-bold text-sm truncate transition-colors ${
                          isSelected ? 'text-neon-magenta' : 'text-text'
                        }`}
                      >
                        {movie.title}
                      </h4>
                      {movie.year && (
                        <span className="text-xs text-muted flex-none">({movie.year})</span>
                      )}
                    </div>

                    {/* Mood & Status tags */}
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span
                        className={`text-[10px] font-pixel px-1.5 py-0.5 rounded ${
                          movie.done
                            ? 'bg-ok/15 text-ok border border-ok/30'
                            : 'bg-primary/15 text-primary-bright border border-primary/30'
                        }`}
                      >
                        {movie.done ? 'DITONTON' : 'WATCHLIST'}
                      </span>

                      {movie.moods?.slice(0, 2).map((mood) => (
                        <span
                          key={mood}
                          className="text-[11px] text-muted bg-surface-elevated px-1.5 py-0.5 rounded border border-line/50"
                        >
                          #{mood}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Arrow Indicator */}
                  <div
                    className={`flex-none pr-1 transition-transform ${
                      isSelected ? 'text-neon-magenta translate-x-0.5' : 'text-muted/40 opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-[2]" aria-hidden="true">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-2.5 border-t border-line/80 bg-surface-elevated/40 flex items-center justify-between text-[11px] text-muted font-sans flex-none">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded font-pixel text-[10px] bg-surface border border-line">↑↓</kbd>
              <span className="hidden sm:inline">Navigasi</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded font-pixel text-[10px] bg-surface border border-line">Enter</kbd>
              <span className="hidden sm:inline">Buka Film</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded font-pixel text-[10px] bg-surface border border-line">Esc</kbd>
              <span className="hidden sm:inline">Tutup</span>
            </span>
          </div>
          <span className="font-pixel text-[10px] text-primary-bright">MOCAB VHS</span>
        </div>
      </div>
    </div>
  );
}
