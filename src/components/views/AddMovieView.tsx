'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CATALOG } from '@/lib/mock-data';
import { addMovie } from '@/lib/movies';
import { createCustomMood } from '@/lib/moods';
import { MoodChips } from '@/components/MoodChips';
import { PosterCover } from '@/components/PosterCover';
import { Badge } from '@/components/Badge';
import { MoodManagerModal } from '@/components/MoodManagerModal';
import { TmdbAttribution } from '@/components/TmdbAttribution';
import { useToast } from '@/components/Toast';
import { Mood } from '@/types';
import { TmdbMovieSearchResult, TmdbSearchApiResponse, TmdbMovieDetail } from '@/types/tmdb';
import { generateMoodSlug } from '@/lib/validations';

interface SelectedMovieState {
  manual: boolean;
  tmdb?: number;
  title: string;
  year: number | string;
  runtime: number | string;
  syn: string;
  posterUrl?: string | null;
  posterPath?: string | null;
}

interface AddMovieViewProps {
  initialMoods?: string[];
  initialMoodObjects?: Mood[];
}

export function AddMovieView({ initialMoods = [], initialMoodObjects = [] }: AddMovieViewProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [tmdbNotConfigured, setTmdbNotConfigured] = useState(false);
  const [searchResults, setSearchResults] = useState<TmdbMovieSearchResult[]>([]);

  const [selectedMovie, setSelectedMovie] = useState<SelectedMovieState | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // State pengelolaan mood
  const [allMoods, setAllMoods] = useState<Mood[]>(
    initialMoodObjects.length > 0
      ? initialMoodObjects
      : initialMoods.map((name) => ({
          id: name,
          name,
          slug: generateMoodSlug(name),
        }))
  );
  const [availableMoods, setAvailableMoods] = useState<string[]>(
    initialMoodObjects.length > 0
      ? initialMoodObjects.map((m) => m.name)
      : initialMoods
  );
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [isMoodModalOpen, setIsMoodModalOpen] = useState(false);

  const [watchUrl, setWatchUrl] = useState('');
  const [saving, setSaving] = useState(false);

  // Quick custom mood state
  const [newMoodName, setNewMoodName] = useState('');
  const [isAddingMood, setIsAddingMood] = useState(false);

  // Ref untuk mengelola pembatalan fetch (mencegah race condition)
  const abortControllerRef = useRef<AbortController | null>(null);
  const formConsoleRef = useRef<HTMLDivElement | null>(null);

  // Debounced search effect
  useEffect(() => {
    const trimmed = query.trim();

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const timer = setTimeout(async () => {
      // Reset pencarian jika query kurang dari 2 karakter
      if (trimmed.length < 2) {
        setIsSearching(false);
        setSearchError(null);
        setSearchResults([]);
        return;
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsSearching(true);
      setSearchError(null);

      try {
        const res = await fetch(`/api/tmdb/search?query=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          const errData = (await res.json().catch(() => ({}))) as { message?: string };
          throw new Error(errData.message || `Pencarian gagal (Status ${res.status}).`);
        }

        const data = (await res.json()) as TmdbSearchApiResponse;

        if (data.source === 'not_configured') {
          // Token TMDB belum dikonfigurasi di server: gunakan katalog simulasi sebagai fallback
          setTmdbNotConfigured(true);
          const lower = trimmed.toLowerCase();
          const mockMatches = CATALOG.filter((c) => c.title.toLowerCase().includes(lower)).map((c) => ({
            tmdbId: c.tmdb,
            title: c.title,
            originalTitle: c.title,
            releaseDate: `${c.year}-01-01`,
            releaseYear: c.year,
            overview: c.syn,
            posterPath: null,
            posterUrl: null,
            backdropPath: null,
            originalLanguage: 'en',
            voteAverage: 0,
          }));
          setSearchResults(mockMatches);
        } else {
          setTmdbNotConfigured(false);
          setSearchResults(data.results || []);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          // Permintaan dibatalkan karena pengguna terus mengetik
          return;
        }
        const msg = err instanceof Error ? err.message : 'Gagal mencari film ke TMDB.';
        setSearchError(msg);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => {
      clearTimeout(timer);
    };
  }, [query]);

  // Handler memilih film dari hasil pencarian
  const handlePickResult = useCallback(async (item: TmdbMovieSearchResult) => {
    // 1. Langsung isi form awal dengan data pencarian agar pengguna tidak menunggu
    setSelectedMovie({
      manual: false,
      tmdb: item.tmdbId,
      title: item.title,
      year: item.releaseYear || '',
      runtime: '',
      syn: item.overview,
      posterUrl: item.posterUrl,
      posterPath: item.posterPath,
    });

    // 2. Halus geser fokus ke form konsol rekaman agar pengguna tidak perlu scrolling manual
    requestAnimationFrame(() => {
      if (formConsoleRef.current) {
        formConsoleRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    // 3. Ambil detail film (untuk runtime) di latar belakang bila ID valid
    if (item.tmdbId && item.tmdbId > 0 && !tmdbNotConfigured) {
      setLoadingDetail(true);
      try {
        const res = await fetch(`/api/tmdb/movie/${item.tmdbId}`);
        if (res.ok) {
          const detail = (await res.json()) as TmdbMovieDetail;
          setSelectedMovie((prev) => {
            if (!prev || prev.tmdb !== item.tmdbId) return prev;
            return {
              ...prev,
              runtime: detail.runtime || prev.runtime,
              syn: detail.overview || prev.syn,
              // Pertahankan posterUrl dan posterPath yang sudah ada bila detail tidak menyediakannya
              posterUrl: detail.posterUrl || prev.posterUrl,
              posterPath: detail.posterPath || prev.posterPath,
            };
          });
        }
      } catch {
        // Abaikan kegagalan detail, pengguna tetap dapat mengisi runtime secara manual
      } finally {
        setLoadingDetail(false);
      }
    }
  }, [tmdbNotConfigured]);

  const handleManual = () => {
    setSelectedMovie({
      manual: true,
      title: query.trim(),
      year: '',
      runtime: '',
      syn: '',
      posterUrl: null,
      posterPath: null,
    });

    requestAnimationFrame(() => {
      if (formConsoleRef.current) {
        formConsoleRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  };

  const handleResetSelection = () => {
    setSelectedMovie(null);
  };

  const handleToggleMood = (mood: string) => {
    setSelectedMoods((prev) =>
      prev.includes(mood) ? prev.filter((m) => m !== mood) : [...prev, mood]
    );
  };

  const handleMoodsChange = (updatedMoods: Mood[]) => {
    setAllMoods(updatedMoods);
    const newNames = updatedMoods.map((m) => m.name);
    setAvailableMoods(newNames);

    // Sinkronisasi selectedMoods: petakan nama yang diubah dan hilangkan nama yang dihapus
    setSelectedMoods((prevSelected) =>
      prevSelected
        .map((oldName) => {
          const directMatch = updatedMoods.find((m) => m.name === oldName);
          if (directMatch) return directMatch.name;

          const oldMoodObj = allMoods.find((m) => m.name === oldName);
          if (oldMoodObj) {
            const stillExists = updatedMoods.find((m) => m.id === oldMoodObj.id);
            if (stillExists) return stillExists.name;
          }
          return null;
        })
        .filter((n): n is string => Boolean(n))
    );
  };

  const handleAddCustomMood = async () => {
    const name = newMoodName.trim();
    if (!name) return;

    if (name.length > 24) {
      showToast('Nama mood maksimal 24 karakter.', true);
      return;
    }

    setIsAddingMood(true);
    try {
      const created = await createCustomMood(name);
      setAllMoods((prev) => [...prev, created]);
      setAvailableMoods((prev) => [...prev, created.name]);
      setSelectedMoods((prev) => [...prev, created.name]);
      setNewMoodName('');
      showToast(`Mood "${created.name}" berhasil ditambahkan.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menambahkan mood baru.';
      showToast(msg, true);
    } finally {
      setIsAddingMood(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedMovie) return;

    if (!selectedMovie.title.trim()) {
      showToast('Judul wajib diisi.', true);
      return;
    }

    if (selectedMoods.length === 0) {
      showToast('Pilih minimal satu mood.', true);
      return;
    }

    const cleanUrl = watchUrl.trim();
    if (cleanUrl && !/^https?:\/\/\S+$/i.test(cleanUrl)) {
      showToast('Tautan harus diawali http:// atau https://', true);
      return;
    }

    setSaving(true);
    try {
      const newMovie = await addMovie({
        tmdbId: selectedMovie.tmdb ?? null,
        title: selectedMovie.title,
        year: selectedMovie.year || '?',
        runtime: selectedMovie.runtime || '?',
        moods: selectedMoods,
        synopsis: selectedMovie.syn,
        watchUrl: cleanUrl,
        posterPath: selectedMovie.posterPath || null,
      });

      showToast(`"${newMovie.title}" masuk ke Kabin.`);
      router.push(`/bank/${newMovie.id}`);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan film.';
      showToast(msg, true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 sm:space-y-10 max-w-5xl mx-auto pb-10">
      {/* ─────────────────────────────────────────────────────────────
          EDITORIAL HEADER (VHS Recording Room)
         ───────────────────────────────────────────────────────────── */}
      <section className="border-b border-line pb-6">
        <div className="flex items-center gap-2 mb-2 text-xs font-pixel tracking-wider uppercase text-lavender flex-wrap">
          <Badge variant="movie" size="xs">RECORDING ROOM</Badge>
          <span className="text-muted/40">/</span>
          <span>Pencarian TMDB</span>
          <span className="text-[10px] font-pixel text-muted/60 tracking-wider ml-auto hidden sm:inline" aria-hidden="true">
            REC MODE // INPUT CONSOLE
          </span>
        </div>
        <h1 className="font-serif font-bold text-3xl sm:text-4xl text-text tracking-tight">
          Tambah Film ke Kabin
        </h1>
        <p className="text-muted text-sm mt-1.5 leading-relaxed max-w-2xl">
          Cari judul film via The Movie Database (TMDB) atau masukkan data secara manual ke perpustakaan film pribadi lu.
        </p>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          STEP 1: INTAKE SEARCH CONSOLE
         ───────────────────────────────────────────────────────────── */}
      {!selectedMovie ? (
        <section className="space-y-4">
          <div>
            <label htmlFor="aq" className="!mt-0 text-xs font-pixel uppercase tracking-wider text-muted flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-bright" />
              <span>1. Cari Judul Film</span>
            </label>
            <div className="relative mt-2">
              {/* Static Left Search Icon */}
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
                <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-[2]" aria-hidden="true">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>

              {/* Search Input dengan padding seimbang: pl-10 (40px) dan pr-16 (64px) untuk mencegah tabrakan ikon/spinner */}
              <input
                type="text"
                id="aq"
                placeholder="Ketik judul film (misal: Past Lives, Drive My Car, Oppenheimer)..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Cari judul film"
                className="pl-10 pr-16 py-3.5 bg-surface border border-line rounded-xl text-sm text-text placeholder:text-muted/60 focus:border-primary-bright focus:bg-surface-elevated transition-all w-full shadow-sm"
              />

              {/* Right Action Container: Loading Spinner dan Tombol Clear yang terpisah rapi */}
              <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center gap-1.5">
                {isSearching && (
                  <div
                    className="w-4 h-4 border-2 border-primary-bright border-t-transparent rounded-full animate-spin flex-none"
                    title="Mencari film di TMDB..."
                    aria-label="Sedang memuat hasil pencarian"
                  />
                )}
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      setSearchResults([]);
                      setSearchError(null);
                    }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-text hover:bg-surface-elevated cursor-pointer transition-colors"
                    aria-label="Hapus kata kunci pencarian"
                    title="Hapus pencarian"
                  >
                    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
                      <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Status Indicator */}
            {tmdbNotConfigured ? (
              <p className="text-[11px] font-mono text-amber mt-2 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber" />
                <span>Token TMDB server belum diset. Menampilkan katalog simulasi lokal.</span>
              </p>
            ) : (
              <p className="text-[11px] font-mono text-muted/70 mt-2 flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-ok" />
                <span>Pencarian terhubung dengan live metadata TMDB API.</span>
              </p>
            )}
          </div>

          {/* Error message saat pencarian */}
          {searchError && (
            <div
              role="alert"
              className="p-3.5 border border-danger/30 bg-danger/10 rounded-xl text-xs sm:text-sm text-danger flex items-center justify-between gap-3"
            >
              <span>{searchError}</span>
              <button
                type="button"
                onClick={handleManual}
                className="btn secondary text-xs py-1 px-2.5 cursor-pointer"
              >
                Isi Manual
              </button>
            </div>
          )}

          {/* Search Results Grid / Cards */}
          {searchResults.length > 0 && (
            <div className="space-y-3 mt-4 pt-3 border-t border-line">
              <div className="flex items-center justify-between text-[11px] font-pixel uppercase tracking-wider text-muted">
                <span>HASIL PENCARIAN ({searchResults.length})</span>
                <span className="text-primary-bright">Pilih salah satu film</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[520px] overflow-y-auto pr-1">
                {searchResults.map((item) => (
                  <div
                    key={item.tmdbId}
                    className="p-3 rounded-xl border border-line bg-surface hover:bg-surface-elevated hover:border-primary-bright/50 transition-all flex gap-3.5 items-start group shadow-xs"
                  >
                    <div className="w-14 sm:w-16 flex-none">
                      <PosterCover
                        title={item.title}
                        identifier={item.tmdbId}
                        posterUrl={item.posterUrl}
                        className="w-full !p-0 rounded-lg shadow-sm"
                      />
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between h-full space-y-2">
                      <div>
                        <h3 className="text-text font-serif font-bold text-sm sm:text-base group-hover:text-primary-bright transition-colors line-clamp-1">
                          {item.title}
                        </h3>

                        <div className="text-muted text-xs font-mono mt-1 flex items-center gap-2 flex-wrap">
                          {item.releaseYear && (
                            <span className="font-semibold text-text-subtle">{item.releaseYear}</span>
                          )}
                          {item.originalLanguage && (
                            <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-surface-elevated border border-line">
                              {item.originalLanguage}
                            </span>
                          )}
                        </div>

                        {item.overview && (
                          <p className="text-muted/80 text-xs line-clamp-2 mt-1.5 leading-relaxed">
                            {item.overview}
                          </p>
                        )}
                      </div>

                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => handlePickResult(item)}
                          className="btn primary text-xs py-1.5 px-3 rounded-lg w-full sm:w-auto font-pixel tracking-wide flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <span>PILIH FILM</span>
                          <span aria-hidden="true">→</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Results from query */}
          {!isSearching && query.trim().length >= 2 && searchResults.length === 0 && !searchError && (
            <div className="p-8 border border-dashed border-line rounded-2xl text-center bg-surface/30 space-y-3">
              <p className="text-sm text-text-subtle">
                Tidak ada hasil untuk &quot;<strong className="text-text">{query}</strong>&quot; di basis data film TMDB.
              </p>
              <button
                type="button"
                onClick={handleManual}
                className="btn primary text-xs sm:text-sm font-semibold cursor-pointer shadow-md shadow-primary/20"
              >
                Input &quot;{query}&quot; Secara Manual
              </button>
            </div>
          )}

          {/* Manual Fallback Trigger */}
          {query.trim().length < 2 && (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleManual}
                className="text-xs text-muted hover:text-primary-bright font-medium transition-colors cursor-pointer inline-flex items-center gap-1.5 p-2 rounded-lg hover:bg-surface"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-[2]" aria-hidden="true">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>Film tidak ada di TMDB? Masukkan data secara manual</span>
              </button>
            </div>
          )}
        </section>
      ) : (
        /* ─────────────────────────────────────────────────────────────
            ACTIVE SELECTION SUMMARY BAR (When movie is picked)
           ───────────────────────────────────────────────────────────── */
        <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/10 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-ok flex-none" />
            <span className="text-xs text-muted font-pixel uppercase tracking-wide">Film Terpilih:</span>
            <span className="text-sm font-serif font-bold text-text truncate max-w-xs sm:max-w-md">
              {selectedMovie.title || 'Film Tanpa Judul'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleResetSelection}
            className="btn secondary text-xs py-1.5 px-3 rounded-lg font-pixel tracking-wide flex items-center gap-1.5 cursor-pointer ml-auto"
          >
            <svg viewBox="0 0 16 16" className="w-3 h-3 fill-current" aria-hidden="true">
              <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
            </svg>
            <span>Ganti film</span>
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          STEP 2: RECORDING CONSOLE (Two-Column Desktop / Responsive Form)
         ───────────────────────────────────────────────────────────── */}
      {selectedMovie && (
        <div ref={formConsoleRef} className="pt-2 animate-in fade-in duration-200">
          <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-[280px_1fr] xl:grid-cols-[320px_1fr] gap-8 items-start">
            {/* ─────────────────────────────────────────────────────────
                LEFT COLUMN: SELECTED MOVIE PREVIEW / DOSSIER ANCHOR
               ───────────────────────────────────────────────────────── */}
            <div className="space-y-4">
              <div className="sticky top-24 space-y-4">
                {/* Poster Anchor */}
                <div className="relative group/selected-poster">
                  <div className="absolute -inset-1.5 bg-gradient-to-r from-primary/20 via-neon-magenta/15 to-primary-bright/20 rounded-2xl blur-lg opacity-40 group-hover/selected-poster:opacity-75 transition duration-500 pointer-events-none" />
                  <PosterCover
                    title={selectedMovie.title || 'Judul Film'}
                    identifier={selectedMovie.tmdb || 999}
                    year={selectedMovie.year}
                    posterUrl={selectedMovie.posterUrl}
                    big
                    className="relative shadow-2xl rounded-xl w-full"
                  />
                </div>

                {/* Selected Movie Dossier Capsule */}
                <div className="card p-4 space-y-3 bg-surface border border-line">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    {selectedMovie.manual ? (
                      <span className="text-[10px] font-pixel uppercase tracking-wider text-accent bg-accent-soft px-2 py-0.5 rounded border border-accent/30">
                        MODE MANUAL
                      </span>
                    ) : (
                      <span className="text-[10px] font-pixel uppercase tracking-wider text-primary-bright bg-primary/15 border border-primary/30 px-2 py-0.5 rounded">
                        TMDB #{selectedMovie.tmdb}
                      </span>
                    )}

                    <Badge variant="watched" size="xs">
                      SIAP DIREKAM
                    </Badge>
                  </div>

                  <div>
                    <h3 className="font-serif font-bold text-base sm:text-lg text-text leading-tight">
                      {selectedMovie.title || 'Belum ada judul'}
                    </h3>
                    <div className="mt-1 text-xs font-mono text-muted flex items-center gap-2">
                      {selectedMovie.year && <span>{selectedMovie.year}</span>}
                      {selectedMovie.runtime && (
                        <>
                          <span className="text-line">/</span>
                          <span>{selectedMovie.runtime} menit</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-line/60">
                    <button
                      type="button"
                      onClick={handleResetSelection}
                      className="btn secondary w-full text-xs py-2 rounded-lg font-pixel tracking-wide flex items-center justify-center gap-1.5 cursor-pointer text-muted hover:text-danger"
                    >
                      <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
                        <path d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z" />
                      </svg>
                      <span>Ganti film lain</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ─────────────────────────────────────────────────────────
                RIGHT COLUMN: RECORDING FORM ORGANIZATION
               ───────────────────────────────────────────────────────── */}
            <div className="space-y-6 sm:space-y-7">
              {/* SECTION 1: FILM IDENTITY */}
              <section className="card p-5 sm:p-6 space-y-4 bg-surface border border-line">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-neon-magenta" />
                    <h2 className="text-xs font-pixel uppercase tracking-wider text-lavender">
                      2. Data Rekaman Film Dipilih
                    </h2>
                  </div>
                  {loadingDetail && (
                    <span className="text-[10px] font-mono text-primary-bright animate-pulse">
                      Memuat durasi TMDB...
                    </span>
                  )}
                </div>

                {selectedMovie.manual ? (
                  <div className="space-y-3.5">
                    <div className="space-y-1.5">
                      <label htmlFor="manual-title" className="!mt-0 text-xs font-medium text-text-subtle">
                        Judul Film <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        id="manual-title"
                        placeholder="Judul Film *"
                        value={selectedMovie.title}
                        onChange={(e) =>
                          setSelectedMovie((prev) =>
                            prev ? { ...prev, title: e.target.value } : null
                          )
                        }
                        required
                        aria-label="Judul film"
                        className="font-medium text-text bg-surface-elevated border-line rounded-lg"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label htmlFor="manual-year" className="!mt-0 text-[11px] font-pixel uppercase text-muted">
                          Tahun Rilis
                        </label>
                        <input
                          type="text"
                          id="manual-year"
                          placeholder="2024"
                          value={selectedMovie.year}
                          onChange={(e) =>
                            setSelectedMovie((prev) =>
                              prev ? { ...prev, year: e.target.value } : null
                            )
                          }
                          aria-label="Tahun rilis"
                          className="bg-surface-elevated border-line rounded-lg text-xs sm:text-sm"
                        />
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="manual-runtime" className="!mt-0 text-[11px] font-pixel uppercase text-muted">
                          Durasi (menit)
                        </label>
                        <input
                          type="text"
                          id="manual-runtime"
                          placeholder="110"
                          value={selectedMovie.runtime}
                          onChange={(e) =>
                            setSelectedMovie((prev) =>
                              prev ? { ...prev, runtime: e.target.value } : null
                            )
                          }
                          aria-label="Durasi menit"
                          className="bg-surface-elevated border-line rounded-lg text-xs sm:text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="manual-syn" className="!mt-0 text-[11px] font-pixel uppercase text-muted">
                        Sinopsis Film
                      </label>
                      <textarea
                        id="manual-syn"
                        placeholder="Tuliskan sinopsis singkat film..."
                        value={selectedMovie.syn}
                        onChange={(e) =>
                          setSelectedMovie((prev) =>
                            prev ? { ...prev, syn: e.target.value } : null
                          )
                        }
                        aria-label="Sinopsis film"
                        className="bg-surface-elevated border-line rounded-lg text-xs sm:text-sm min-h-[84px] leading-relaxed"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label htmlFor="tmdb-year" className="!mt-0 text-[11px] font-pixel uppercase text-muted">
                          Tahun Rilis
                        </label>
                        <input
                          type="text"
                          id="tmdb-year"
                          value={selectedMovie.year}
                          onChange={(e) =>
                            setSelectedMovie((prev) =>
                              prev ? { ...prev, year: e.target.value } : null
                            )
                          }
                          aria-label="Tahun rilis"
                          className="bg-surface-elevated border-line rounded-lg text-xs sm:text-sm py-2 px-3"
                        />
                      </div>

                      <div className="space-y-1">
                        <label htmlFor="tmdb-runtime" className="!mt-0 text-[11px] font-pixel uppercase text-muted">
                          Durasi (menit)
                        </label>
                        <input
                          type="text"
                          id="tmdb-runtime"
                          placeholder="misal: 115"
                          value={selectedMovie.runtime}
                          onChange={(e) =>
                            setSelectedMovie((prev) =>
                              prev ? { ...prev, runtime: e.target.value } : null
                            )
                          }
                          aria-label="Durasi film"
                          className="bg-surface-elevated border-line rounded-lg text-xs sm:text-sm py-2 px-3"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="tmdb-syn" className="!mt-0 text-[11px] font-pixel uppercase text-muted">
                        Sinopsis Film
                      </label>
                      <textarea
                        id="tmdb-syn"
                        value={selectedMovie.syn}
                        onChange={(e) =>
                          setSelectedMovie((prev) =>
                            prev ? { ...prev, syn: e.target.value } : null
                          )
                        }
                        aria-label="Sinopsis film"
                        className="bg-surface-elevated border-line rounded-lg text-xs sm:text-sm min-h-[84px] leading-relaxed"
                      />
                    </div>
                  </div>
                )}
              </section>

              {/* SECTION 2: MOOD CURATION */}
              <section className="card p-5 sm:p-6 space-y-4 bg-surface border border-line">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary-bright" />
                    <label className="!mt-0 text-xs font-pixel uppercase tracking-wider text-lavender">
                      3. Kurasi Mood <span className="text-danger">*</span>
                    </label>
                  </div>

                  {/* Tombol Akses Kelola Mood */}
                  <button
                    type="button"
                    onClick={() => setIsMoodModalOpen(true)}
                    className="text-xs font-pixel text-primary-bright hover:text-neon-magenta flex items-center gap-1.5 transition-colors cursor-pointer py-1 px-2.5 rounded-lg border border-line bg-surface-elevated"
                    aria-label="Buka dialog kelola mood"
                  >
                    <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
                      <path d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872l-.1-.34zM8 10.93a2.929 2.929 0 1 1 0-5.86 2.929 2.929 0 0 1 0 5.858z" />
                    </svg>
                    <span>Kelola Mood</span>
                  </button>
                </div>

                <p className="text-xs text-muted">
                  Pilih nuansa dan spektrum rasa yang cocok untuk katalog kuratorial film ini.
                </p>

                {availableMoods.length > 0 ? (
                  <MoodChips
                    moods={availableMoods}
                    selectedMoods={selectedMoods}
                    onToggle={handleToggleMood}
                    wrap
                  />
                ) : (
                  <p className="text-muted text-xs italic">
                    Belum ada mood tersimpan. Tambahkan mood baru di bawah ini atau melalui menu Kelola Mood.
                  </p>
                )}

                {/* Quick Custom Mood Addition */}
                <div className="flex items-center gap-2 pt-2 border-t border-line/40 flex-wrap">
                  <input
                    type="text"
                    placeholder="+ Mood kustom (1-24 karakter)"
                    value={newMoodName}
                    onChange={(e) => setNewMoodName(e.target.value)}
                    maxLength={24}
                    aria-label="Nama mood kustom baru"
                    className="max-w-[240px] text-xs py-2 px-3 bg-surface-elevated border border-line rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomMood}
                    disabled={isAddingMood || !newMoodName.trim()}
                    className="btn secondary text-xs py-2 px-3 font-medium cursor-pointer disabled:opacity-50"
                  >
                    {isAddingMood ? 'Menambahkan...' : 'Tambah Mood'}
                  </button>
                </div>
              </section>

              {/* SECTION 3: ADDITIONAL INFORMATION (Progressive Disclosure) */}
              <section className="card p-5 sm:p-6 space-y-3 bg-surface border border-line">
                <div className="flex items-center gap-2 border-b border-line pb-2.5">
                  <span className="w-2 h-2 rounded-full bg-lavender" />
                  <label htmlFor="au" className="!mt-0 text-xs font-pixel uppercase tracking-wider text-lavender">
                    4. Tautan Nonton <span className="text-muted/60 font-mono font-normal lowercase">(opsional)</span>
                  </label>
                </div>
                <p className="text-xs text-muted">
                  Tautkan link platform streaming legal atau arsip digital agar mudah dibuka kembali saat sesi nonton.
                </p>
                <input
                  type="text"
                  id="au"
                  placeholder="https://... (tautan legal atau platform streaming)"
                  value={watchUrl}
                  onChange={(e) => setWatchUrl(e.target.value)}
                  className="text-xs sm:text-sm bg-surface-elevated border-line rounded-lg"
                />
              </section>

              {/* SECTION 4: SAVE ACTION */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="btn primary w-full py-4 text-sm font-semibold shadow-lg shadow-primary/25 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 text-white"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  <span>{saving ? 'Menyimpan Film ke Kabin...' : 'Simpan Film ke Kabin'}</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* TMDB Official Attribution */}
      <section className="pt-4 border-t border-line">
        <TmdbAttribution />
      </section>

      {/* Mood Management Modal Dialog */}
      <MoodManagerModal
        isOpen={isMoodModalOpen}
        onClose={() => setIsMoodModalOpen(false)}
        moods={allMoods}
        onMoodsChange={handleMoodsChange}
      />
    </div>
  );
}
