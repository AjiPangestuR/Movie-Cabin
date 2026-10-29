'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CATALOG } from '@/lib/mock-data';
import { addMovie } from '@/lib/movies';
import { createCustomMood } from '@/lib/moods';
import { MoodChips } from '@/components/MoodChips';
import { PosterCover } from '@/components/PosterCover';
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

    // 2. Ambil detail film (untuk runtime) di latar belakang bila ID valid
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
    <div className="space-y-8 sm:space-y-10 max-w-2xl mx-auto">
      {/* Editorial Header */}
      <section className="border-b border-line/60 pb-6">
        <div className="flex items-center gap-2 mb-2 text-xs font-mono tracking-widest uppercase text-muted/70">
          <span>Curated Intake</span>
          <span className="text-muted/30">/</span>
          <span>Pencarian TMDB</span>
        </div>
        <h1 className="font-serif font-bold text-3xl sm:text-4xl text-text tracking-tight">
          Tambah Film ke Kabin
        </h1>
        <p className="text-muted text-sm mt-1 leading-relaxed">
          Cari judul film via The Movie Database (TMDB) atau masukkan data secara manual ke perpustakaan pribadi lu.
        </p>
      </section>

      {/* Step 1: Catalog Search / Intake */}
      <section className="space-y-4">
        <div>
          <label htmlFor="aq" className="!mt-0 text-xs font-mono uppercase tracking-wider text-muted">
            1. Cari Judul Film
          </label>
          <div className="relative mt-1.5">
            {/* Static Left Search Icon */}
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
              <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-[2]" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>

            {/* Search Input dengan padding seimbang: pl-10 (40px) dan pr-16 (64px) */}
            <input
              type="text"
              id="aq"
              placeholder="Ketik judul film (misal: Past Lives, Drive My Car, Oppenheimer)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Cari judul film"
              className="pl-10 pr-16 py-2.5 bg-surface border border-line rounded-lg text-sm text-text placeholder:text-muted/60 focus:border-accent focus:bg-surface-elevated transition-all w-full"
            />

            {/* Right Action Container: Loading Spinner dan Tombol Clear yang terpisah rapi */}
            <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center gap-1.5">
              {isSearching && (
                <div
                  className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin flex-none"
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
                  className="w-7 h-7 rounded flex items-center justify-center text-muted hover:text-text hover:bg-surface-elevated cursor-pointer transition-colors"
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
            <p className="text-[11px] font-mono text-amber mt-1.5 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber" />
              <span>Token TMDB server belum diset. Menampilkan katalog simulasi lokal.</span>
            </p>
          ) : (
            <p className="text-[11px] font-mono text-muted/60 mt-1.5 flex items-center gap-1.5">
              <span className="inline-block w-1 h-1 rounded-full bg-accent" />
              <span>Pencarian terhubung dengan live metadata TMDB API.</span>
            </p>
          )}
        </div>

        {/* Error message saat pencarian */}
        {searchError && (
          <div
            role="alert"
            className="p-3.5 border border-danger/30 bg-danger/10 rounded-lg text-xs sm:text-sm text-danger flex items-center justify-between gap-3"
          >
            <span>{searchError}</span>
            <button
              type="button"
              onClick={handleManual}
              className="btn text-xs py-1 px-2.5 bg-surface text-text hover:bg-surface-elevated cursor-pointer"
            >
              Isi Manual
            </button>
          </div>
        )}

        {/* Search Results List */}
        {searchResults.length > 0 && (
          <div className="space-y-2 mt-3 pt-2 border-t border-line/40">
            <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-muted">
              <span>Hasil Ditemukan ({searchResults.length})</span>
              <span>Pilih salah satu film</span>
            </div>
            <div className="space-y-2 max-h-84 overflow-y-auto pr-1">
              {searchResults.map((item) => (
                <button
                  key={item.tmdbId}
                  type="button"
                  onClick={() => handlePickResult(item)}
                  className="res cursor-pointer text-left w-full group transition-all"
                >
                  <div className="w-12 flex-none">
                    <PosterCover
                      title=""
                      identifier={item.tmdbId}
                      posterUrl={item.posterUrl}
                      className="w-12 !p-0 rounded"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-text font-medium text-sm group-hover:text-accent transition-colors truncate">
                      {item.title}
                    </div>
                    <div className="text-muted text-xs font-mono mt-0.5 flex items-center gap-2">
                      {item.releaseYear && <span>{item.releaseYear}</span>}
                      {item.originalLanguage && (
                        <span className="uppercase text-[10px] px-1 py-0.2 rounded bg-surface-elevated border border-line-subtle">
                          {item.originalLanguage}
                        </span>
                      )}
                    </div>
                    {item.overview && (
                      <p className="text-muted/80 text-xs line-clamp-1 mt-1 leading-relaxed">
                        {item.overview}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-accent/80 font-medium px-2.5 py-1 rounded bg-accent-soft group-hover:bg-accent group-hover:text-[#121017] transition-all flex-none">
                    Pilih
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* No Results from query */}
        {!isSearching && query.trim().length >= 2 && searchResults.length === 0 && !searchError && (
          <div className="p-6 border border-dashed border-line rounded-xl text-center bg-surface/30 space-y-3">
            <p className="text-sm text-text-subtle">
              Tidak ada hasil untuk &quot;<strong className="text-text">{query}</strong>&quot; di basis data film.
            </p>
            <button
              type="button"
              onClick={handleManual}
              className="btn primary text-xs sm:text-sm font-semibold cursor-pointer"
            >
              Input &quot;{query}&quot; Secara Manual
            </button>
          </div>
        )}

        {/* Manual Fallback Trigger */}
        {!selectedMovie && query.trim().length < 2 && (
          <div className="pt-2">
            <button
              type="button"
              onClick={handleManual}
              className="text-xs text-muted hover:text-accent font-medium transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none stroke-[2]" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>Film tidak ada di TMDB? Masukkan data secara manual</span>
            </button>
          </div>
        )}
      </section>

      {/* Step 2: Selected Movie Details & Form */}
      {selectedMovie && (
        <form onSubmit={handleSave} className="space-y-6 pt-4 border-t border-line/60">
          <div className="flex items-center justify-between">
            <label className="!mt-0 text-xs font-mono uppercase tracking-wider text-muted">
              2. Data Film Dipilih
            </label>
            <button
              type="button"
              onClick={() => setSelectedMovie(null)}
              className="text-xs text-muted hover:text-danger transition-colors cursor-pointer"
            >
              Ganti film
            </button>
          </div>

          {/* Film Card / Preview */}
          <div className="panel border border-line-subtle bg-surface-elevated/70">
            <div className="flex items-start gap-4">
              <div className="w-20 sm:w-24 flex-none">
                <PosterCover
                  title={selectedMovie.title || 'Judul Film'}
                  identifier={selectedMovie.tmdb || 999}
                  year={selectedMovie.year}
                  posterUrl={selectedMovie.posterUrl}
                />
              </div>

              <div className="flex-1 min-w-0 space-y-3">
                {selectedMovie.manual ? (
                  <div className="space-y-2.5">
                    <div>
                      <span className="text-[11px] font-mono text-accent block mb-1">
                        Mode Input Manual
                      </span>
                      <input
                        type="text"
                        placeholder="Judul Film *"
                        value={selectedMovie.title}
                        onChange={(e) =>
                          setSelectedMovie((prev) =>
                            prev ? { ...prev, title: e.target.value } : null
                          )
                        }
                        required
                        aria-label="Judul film"
                        className="font-medium text-text bg-bg"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Tahun (misal: 2024)"
                        value={selectedMovie.year}
                        onChange={(e) =>
                          setSelectedMovie((prev) =>
                            prev ? { ...prev, year: e.target.value } : null
                          )
                        }
                        aria-label="Tahun rilis"
                        className="bg-bg text-xs sm:text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Durasi menit (misal: 110)"
                        value={selectedMovie.runtime}
                        onChange={(e) =>
                          setSelectedMovie((prev) =>
                            prev ? { ...prev, runtime: e.target.value } : null
                          )
                        }
                        aria-label="Durasi menit"
                        className="bg-bg text-xs sm:text-sm"
                      />
                    </div>
                    <textarea
                      placeholder="Sinopsis singkat..."
                      value={selectedMovie.syn}
                      onChange={(e) =>
                        setSelectedMovie((prev) =>
                          prev ? { ...prev, syn: e.target.value } : null
                        )
                      }
                      aria-label="Sinopsis film"
                      className="bg-bg text-xs sm:text-sm min-h-[72px]"
                    />
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-accent bg-accent-soft px-2 py-0.5 rounded inline-block">
                        TMDB #{selectedMovie.tmdb}
                      </span>
                      {loadingDetail && (
                        <span className="text-[10px] font-mono text-muted animate-pulse">
                          Memuat durasi...
                        </span>
                      )}
                    </div>
                    <h3 className="font-serif font-bold text-lg text-text">
                      {selectedMovie.title}
                    </h3>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <label className="!mt-0 text-[11px] text-muted font-mono uppercase">
                          Tahun
                        </label>
                        <input
                          type="text"
                          value={selectedMovie.year}
                          onChange={(e) =>
                            setSelectedMovie((prev) =>
                              prev ? { ...prev, year: e.target.value } : null
                            )
                          }
                          aria-label="Tahun rilis"
                          className="bg-bg text-xs py-1.5 px-2 mt-1"
                        />
                      </div>
                      <div>
                        <label className="!mt-0 text-[11px] text-muted font-mono uppercase">
                          Durasi (menit)
                        </label>
                        <input
                          type="text"
                          placeholder="misal: 115"
                          value={selectedMovie.runtime}
                          onChange={(e) =>
                            setSelectedMovie((prev) =>
                              prev ? { ...prev, runtime: e.target.value } : null
                            )
                          }
                          aria-label="Durasi film"
                          className="bg-bg text-xs py-1.5 px-2 mt-1"
                        />
                      </div>
                    </div>
                    <div className="mt-2.5">
                      <label className="!mt-0 text-[11px] text-muted font-mono uppercase">
                        Sinopsis
                      </label>
                      <textarea
                        value={selectedMovie.syn}
                        onChange={(e) =>
                          setSelectedMovie((prev) =>
                            prev ? { ...prev, syn: e.target.value } : null
                          )
                        }
                        aria-label="Sinopsis film"
                        className="bg-bg text-xs sm:text-sm mt-1 min-h-[70px] leading-relaxed"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Step 3: Mood Assignment & Management */}
          <div className="space-y-3 pt-2 border-t border-line/40">
            <div className="flex items-center justify-between">
              <label className="!mt-0 text-xs font-mono uppercase tracking-wider text-muted">
                3. Kurasi Mood <span className="text-danger">*</span>
              </label>

              {/* Tombol Akses Kelola Mood */}
              <button
                type="button"
                onClick={() => setIsMoodModalOpen(true)}
                className="text-xs font-mono text-accent hover:text-accent/80 flex items-center gap-1.5 transition-colors cursor-pointer py-1 px-2 rounded hover:bg-surface-elevated"
                aria-label="Buka dialog kelola mood"
              >
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
                  <path d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872l-.1-.34zM8 10.93a2.929 2.929 0 1 1 0-5.86 2.929 2.929 0 0 1 0 5.858z" />
                </svg>
                <span>Kelola Mood</span>
              </button>
            </div>

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
            <div className="flex items-center gap-2 pt-1.5">
              <input
                type="text"
                placeholder="+ Mood kustom (1-24 karakter)"
                value={newMoodName}
                onChange={(e) => setNewMoodName(e.target.value)}
                maxLength={24}
                aria-label="Nama mood kustom baru"
                className="max-w-[240px] text-xs py-2 px-3 bg-surface border border-line rounded-lg"
              />
              <button
                type="button"
                onClick={handleAddCustomMood}
                disabled={isAddingMood || !newMoodName.trim()}
                className="btn text-xs py-2 px-3 bg-surface-elevated font-medium cursor-pointer disabled:opacity-50"
              >
                {isAddingMood ? 'Menambahkan...' : 'Tambah Mood'}
              </button>
            </div>
          </div>

          {/* Step 4: Optional Watch URL */}
          <div className="space-y-2 pt-2 border-t border-line/40">
            <label htmlFor="au" className="!mt-0 text-xs font-mono uppercase tracking-wider text-muted">
              4. Tautan Nonton <span className="text-muted/60 font-normal lowercase">(opsional)</span>
            </label>
            <input
              type="text"
              id="au"
              placeholder="https://... (tautan legal atau platform streaming)"
              value={watchUrl}
              onChange={(e) => setWatchUrl(e.target.value)}
              className="text-xs sm:text-sm"
            />
          </div>

          {/* Submit Action */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={saving}
              className="btn primary w-full py-3 text-sm font-semibold shadow-md shadow-accent/20 cursor-pointer"
            >
              {saving ? 'Menyimpan Film ke Kabin...' : 'Simpan Film ke Kabin'}
            </button>
          </div>
        </form>
      )}

      {/* TMDB Official Attribution */}
      <section className="pt-4 border-t border-line/60">
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
