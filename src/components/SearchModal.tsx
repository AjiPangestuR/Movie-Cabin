'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Movie, JournalEntry, PersonalNote } from '@/types';
import { listMovies } from '@/lib/movies';
import { listJournals } from '@/lib/journal';
import { listNotes } from '@/lib/notes';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SearchCategory = 'all' | 'movies' | 'journals' | 'notes';

interface UnifiedSearchResult {
  id: string;
  category: 'movie' | 'journal' | 'note';
  title: string;
  subtitle?: string;
  snippet?: string;
  badgeText: string;
  badgeClass: string;
  tags?: string[];
  posterUrl?: string | null;
  route: string;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('all');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [notes, setNotes] = useState<PersonalNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Close modal and reset search input
  const handleClose = useCallback(() => {
    setQuery('');
    setActiveCategory('all');
    setSelectedIndex(0);
    onClose();
  }, [onClose]);

  // Load all domains (movies, journals, notes) when modal opens
  const fetchLibraryData = useCallback(() => {
    Promise.resolve().then(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [moviesRes, journalsRes, notesRes] = await Promise.allSettled([
          listMovies(),
          listJournals({ limit: 60 }),
          listNotes({ limit: 60 }),
        ]);

        if (moviesRes.status === 'fulfilled') {
          setMovies(moviesRes.value);
        } else {
          console.error('Gagal memuat film:', moviesRes.reason);
        }

        if (journalsRes.status === 'fulfilled') {
          setJournals(journalsRes.value.entries);
        } else {
          console.warn('Gagal memuat jurnal:', journalsRes.reason);
        }

        if (notesRes.status === 'fulfilled') {
          setNotes(notesRes.value.notes);
        } else {
          console.warn('Gagal memuat catatan:', notesRes.reason);
        }

        if (
          moviesRes.status === 'rejected' &&
          journalsRes.status === 'rejected' &&
          notesRes.status === 'rejected'
        ) {
          setError('Gagal memuat data pencarian dari database.');
        }

        setHasLoaded(true);
      } catch {
        setError('Gagal memuat data pencarian dari database.');
      } finally {
        setIsLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    if (isOpen && !hasLoaded) {
      fetchLibraryData();
    }
  }, [isOpen, hasLoaded, fetchLibraryData]);

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

  // Extract snippet highlighting match in body content
  const extractSnippet = (content: string, q: string): string => {
    if (!content) return '';
    const cleanContent = content.replace(/\s+/g, ' ').trim();
    if (!q) return cleanContent.slice(0, 90) + (cleanContent.length > 90 ? '...' : '');

    const lowerContent = cleanContent.toLowerCase();
    const matchIndex = lowerContent.indexOf(q.toLowerCase());
    if (matchIndex === -1) {
      return cleanContent.slice(0, 90) + (cleanContent.length > 90 ? '...' : '');
    }

    const start = Math.max(0, matchIndex - 30);
    const end = Math.min(cleanContent.length, matchIndex + q.length + 50);
    const prefix = start > 0 ? '...' : '';
    const suffix = end < cleanContent.length ? '...' : '';
    return prefix + cleanContent.slice(start, end).trim() + suffix;
  };

  // Filter items across categories
  const filteredResults = useMemo<UnifiedSearchResult[]>(() => {
    const q = query.trim().toLowerCase();

    // 1. Map and filter Movies
    const matchedMovies: UnifiedSearchResult[] = movies
      .filter((m) => {
        if (!q) return true;
        const matchTitle = m.title.toLowerCase().includes(q);
        const matchYear = m.year?.toString().includes(q);
        const matchMood = m.moods?.some((mood) => mood.toLowerCase().includes(q));
        return matchTitle || matchYear || matchMood;
      })
      .map((m) => ({
        id: m.id,
        category: 'movie',
        title: m.title,
        subtitle: m.year ? `(${m.year})` : undefined,
        badgeText: m.done ? 'DITONTON' : 'WATCHLIST',
        badgeClass: m.done
          ? 'bg-ok/15 text-ok border border-ok/30'
          : 'bg-primary/15 text-primary-bright border border-primary/30',
        tags: m.moods?.slice(0, 2),
        posterUrl: m.posterUrl,
        route: `/bank/${m.id}`,
      }));

    // 2. Map and filter Journals (title, body content, tags, mood)
    const matchedJournals: UnifiedSearchResult[] = journals
      .filter((j) => {
        if (!q) return true;
        const matchTitle = j.title.toLowerCase().includes(q);
        const matchContent = j.content.toLowerCase().includes(q);
        const matchTags = j.tags?.some((tag) => tag.toLowerCase().includes(q));
        const matchMood = j.mood?.toLowerCase().includes(q);
        return matchTitle || matchContent || matchTags || matchMood;
      })
      .map((j) => ({
        id: j.id,
        category: 'journal',
        title: j.title,
        subtitle: j.entryDate,
        snippet: extractSnippet(j.content, q),
        badgeText: j.isDraft ? 'DRAF JURNAL' : 'JURNAL',
        badgeClass: 'bg-lavender/15 text-lavender border border-lavender/30',
        tags: j.mood ? [`#${j.mood}`, ...(j.tags || []).slice(0, 1)] : j.tags?.slice(0, 2),
        route: `/journal/${j.id}`,
      }));

    // 3. Map and filter Notes (title, body content, tags)
    const matchedNotes: UnifiedSearchResult[] = notes
      .filter((n) => {
        if (!q) return true;
        const matchTitle = n.title.toLowerCase().includes(q);
        const matchContent = n.content.toLowerCase().includes(q);
        const matchTags = n.tags?.some((tag) => tag.toLowerCase().includes(q));
        return matchTitle || matchContent || matchTags;
      })
      .map((n) => ({
        id: n.id,
        category: 'note',
        title: n.title,
        snippet: extractSnippet(n.content, q),
        badgeText: n.isPinned ? '📌 CATATAN' : 'CATATAN',
        badgeClass: 'bg-secondary/15 text-secondary border border-secondary/30',
        tags: n.tags?.slice(0, 2).map((t) => `#${t}`),
        route: `/notes/${n.id}`,
      }));

    if (activeCategory === 'movies') {
      return !q ? matchedMovies.slice(0, 10) : matchedMovies;
    }
    if (activeCategory === 'journals') {
      return !q ? matchedJournals.slice(0, 10) : matchedJournals;
    }
    if (activeCategory === 'notes') {
      return !q ? matchedNotes.slice(0, 10) : matchedNotes;
    }

    // Default 'all': interleaves or merges results
    if (!q) {
      // Empty query default view: show up to 8 recent movies first for backwards compatibility
      return matchedMovies.slice(0, 8);
    }

    return [...matchedMovies, ...matchedJournals, ...matchedNotes];
  }, [movies, journals, notes, query, activeCategory]);

  // Auto-scroll active item into view
  useEffect(() => {
    const container = listRef.current;
    if (!container) return;
    const activeItem = container.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement;
    if (activeItem) {
      activeItem.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  const handleSelectItem = useCallback(
    (item: UnifiedSearchResult) => {
      handleClose();
      // Detail routing compatible with existing expectations
      if (item.category === 'movie') {
        router.push(`/bank/${item.id}`);
      } else {
        router.push(item.route);
      }
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
        handleSelectItem(selected);
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

  const handleCategoryChange = (cat: SearchCategory) => {
    setActiveCategory(cat);
    setSelectedIndex(0);
    inputRef.current?.focus();
  };

  if (!isOpen) {
    return null;
  }

  const categoryCounts = {
    all: movies.length + journals.length + notes.length,
    movies: movies.length,
    journals: journals.length,
    notes: notes.length,
  };

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Pencarian Global MOCAB"
      className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 px-3 sm:px-4 pb-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div
        className="bg-surface border border-line rounded-2xl shadow-2xl max-w-xl w-full flex flex-col overflow-hidden max-h-[86vh] sm:max-h-[82vh] transition-colors"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-3.5 sm:px-4 py-3.5 border-b border-line/80 bg-surface-elevated/40 flex-none">
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
            placeholder="Cari film, jurnal kurator, atau catatan..."
            aria-label="Ketik kata kunci untuk mencari film, jurnal, atau catatan"
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
              className="p-1.5 rounded-md text-muted hover:text-text hover:bg-surface-elevated transition-colors cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
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
            className="px-2.5 py-1.5 rounded text-[11px] font-pixel border border-line bg-surface text-muted hover:text-text hover:border-line-subtle transition-colors cursor-pointer min-h-[36px] flex items-center justify-center"
          >
            ESC
          </button>
        </div>

        {/* Multi-Category Tabs Switcher */}
        <div
          role="tablist"
          aria-label="Kategori Pencarian"
          className="flex items-center gap-1.5 px-3 sm:px-4 py-2 border-b border-line/60 bg-surface/90 overflow-x-auto no-scrollbar flex-none"
        >
          {(
            [
              { id: 'all', label: 'Semua', count: categoryCounts.all },
              { id: 'movies', label: 'Film', count: categoryCounts.movies },
              { id: 'journals', label: 'Jurnal', count: categoryCounts.journals },
              { id: 'notes', label: 'Catatan', count: categoryCounts.notes },
            ] as const
          ).map((tab) => {
            const isActive = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                type="button"
                aria-selected={isActive}
                onClick={() => handleCategoryChange(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium whitespace-nowrap transition-all cursor-pointer min-h-[36px] sm:min-h-[32px] ${
                  isActive
                    ? 'bg-neon-magenta/15 text-neon-magenta border border-neon-magenta/40 shadow-xs'
                    : 'text-muted hover:text-text hover:bg-surface-elevated/70 border border-transparent'
                }`}
              >
                <span>{tab.label}</span>
                {hasLoaded && (
                  <span className={`text-[10px] ${isActive ? 'text-neon-magenta' : 'text-muted/60'}`}>
                    ({tab.count})
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Section Tag */}
        <div className="px-4 py-1.5 border-b border-line/40 bg-surface/80 flex items-center justify-between text-[11px] font-pixel text-muted flex-none">
          <span>
            {query.trim()
              ? `HASIL PENCARIAN (${filteredResults.length})`
              : activeCategory === 'all'
                ? 'FILM TERBARU DI KOLEKSI'
                : `KOLEKSI ${activeCategory.toUpperCase()}`}
          </span>
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
              <p className="text-xs font-sans">Memuat koleksi Movie Cabin...</p>
            </div>
          )}

          {/* Error State */}
          {!isLoading && error && (
            <div className="py-10 px-4 text-center">
              <p className="text-xs text-danger mb-3">{error}</p>
              <button
                type="button"
                onClick={fetchLibraryData}
                className="px-3 py-1.5 rounded-lg border border-line bg-surface-elevated text-xs font-medium text-text hover:border-primary cursor-pointer min-h-[44px]"
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
                {query.trim() ? 'Tidak Ada Hasil yang Cocok' : 'Belum Ada Konten di Kategori Ini'}
              </h3>
              <p className="text-xs text-muted max-w-xs leading-relaxed">
                {query.trim()
                  ? `Tidak menemukan film, jurnal, atau catatan dengan kata kunci "${query}". Coba periksa ejaan atau ubah tab kategori.`
                  : 'Belum ada konten yang tersimpan. Mulai tambahkan film, buat draf jurnal, atau catat ide spontan.'}
              </p>
            </div>
          )}

          {/* Results List */}
          {!isLoading &&
            filteredResults.map((item, index) => {
              const isSelected = index === selectedIndex;

              return (
                <div
                  key={`${item.category}-${item.id}`}
                  data-index={index}
                  onClick={() => handleSelectItem(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`group flex items-start sm:items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-neon-magenta/10 border-neon-magenta/40 shadow-xs'
                      : 'border-transparent hover:bg-surface-elevated/60'
                  }`}
                >
                  {/* Leading Visual / Thumbnail */}
                  <div className="relative w-10 h-14 rounded-md overflow-hidden bg-surface-elevated border border-line/60 flex-none flex items-center justify-center mt-0.5 sm:mt-0">
                    {item.posterUrl ? (
                      <Image
                        src={item.posterUrl}
                        alt={item.title}
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    ) : item.category === 'movie' ? (
                      <div className="w-full h-full flex flex-col items-center justify-center p-1 text-center bg-surface-elevated">
                        <span className="font-pixel text-[9px] text-muted font-bold">VHS</span>
                      </div>
                    ) : item.category === 'journal' ? (
                      <div className="w-full h-full flex flex-col items-center justify-center p-1 text-center bg-lavender/10 text-lavender">
                        <span className="font-pixel text-[8px] font-bold">JRNL</span>
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-1 text-center bg-secondary/10 text-secondary">
                        <span className="font-pixel text-[8px] font-bold">NOTE</span>
                      </div>
                    )}
                  </div>

                  {/* Title, Snippet & Metadata */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4
                        className={`font-serif font-bold text-sm truncate transition-colors ${
                          isSelected ? 'text-neon-magenta' : 'text-text'
                        }`}
                      >
                        {item.title}
                      </h4>
                      {item.subtitle && (
                        <span className="text-xs text-muted font-mono flex-none">{item.subtitle}</span>
                      )}
                    </div>

                    {/* Body Snippet if matched or present */}
                    {item.snippet && (
                      <p className="text-xs text-muted/80 line-clamp-1 italic font-sans mt-0.5">
                        {item.snippet}
                      </p>
                    )}

                    {/* Badges & Tags */}
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className={`text-[10px] font-pixel px-1.5 py-0.5 rounded ${item.badgeClass}`}>
                        {item.badgeText}
                      </span>

                      {item.tags?.map((tag) => (
                        <span
                          key={tag}
                          className="text-[11px] text-muted bg-surface-elevated px-1.5 py-0.5 rounded border border-line/50"
                        >
                          {tag.startsWith('#') ? tag : `#${tag}`}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Arrow Indicator */}
                  <div
                    className={`flex-none pr-1 self-center transition-transform ${
                      isSelected
                        ? 'text-neon-magenta translate-x-0.5'
                        : 'text-muted/40 opacity-0 group-hover:opacity-100'
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
              <span className="hidden sm:inline">Buka</span>
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
