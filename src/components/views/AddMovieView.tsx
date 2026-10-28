'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { CATALOG } from '@/lib/mock-data';
import { addMovie } from '@/lib/movies';
import { createCustomMood } from '@/lib/moods';
import { MoodChips } from '@/components/MoodChips';
import { PosterCover } from '@/components/PosterCover';
import { useToast } from '@/components/Toast';

interface SelectedMovieState {
  manual: boolean;
  tmdb?: number;
  title: string;
  year: number | string;
  runtime: number | string;
  syn: string;
}

interface AddMovieViewProps {
  initialMoods?: string[];
}

export function AddMovieView({ initialMoods = [] }: AddMovieViewProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [query, setQuery] = useState('');
  const [selectedMovie, setSelectedMovie] = useState<SelectedMovieState | null>(null);
  const [availableMoods, setAvailableMoods] = useState<string[]>(initialMoods);
  const [selectedMoods, setSelectedMoods] = useState<string[]>([]);
  const [watchUrl, setWatchUrl] = useState('');
  const [saving, setSaving] = useState(false);

  // Custom mood state
  const [newMoodName, setNewMoodName] = useState('');
  const [isAddingMood, setIsAddingMood] = useState(false);

  const trimmedQuery = query.trim().toLowerCase();

  const searchResults = useMemo(() => {
    if (trimmedQuery.length < 2) return [];
    return CATALOG.filter((c) => c.title.toLowerCase().includes(trimmedQuery));
  }, [trimmedQuery]);

  const handlePickResult = (catalogItem: (typeof CATALOG)[number]) => {
    setSelectedMovie({
      manual: false,
      tmdb: catalogItem.tmdb,
      title: catalogItem.title,
      year: catalogItem.year,
      runtime: catalogItem.runtime,
      syn: catalogItem.syn,
    });
  };

  const handleManual = () => {
    setSelectedMovie({
      manual: true,
      title: query.trim(),
      year: '',
      runtime: '',
      syn: '',
    });
  };

  const handleToggleMood = (mood: string) => {
    setSelectedMoods((prev) =>
      prev.includes(mood) ? prev.filter((m) => m !== mood) : [...prev, mood]
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
          <span>Penambahan Koleksi</span>
        </div>
        <h1 className="font-serif font-bold text-3xl sm:text-4xl text-text tracking-tight">
          Tambah Film ke Kabin
        </h1>
        <p className="text-muted text-sm mt-1 leading-relaxed">
          Cari dari katalog referensi atau masukkan data film secara manual ke dalam perpustakaan pribadi lu.
        </p>
      </section>

      {/* Step 1: Catalog Search / Intake */}
      <section className="space-y-4">
        <div>
          <label htmlFor="aq" className="!mt-0 text-xs font-mono uppercase tracking-wider text-muted">
            1. Cari Judul Film
          </label>
          <div className="relative mt-1.5">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
              <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-[2]" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <input
              type="text"
              id="aq"
              placeholder="Ketik judul film (misal: Past Lives, Drive My Car)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Cari judul film"
              className="pl-10 pr-4 py-2.5 bg-surface border border-line rounded-lg text-sm text-text placeholder:text-muted/60 focus:border-accent focus:bg-surface-elevated transition-all"
            />
          </div>
          <p className="text-[11px] font-mono text-muted/60 mt-1.5 flex items-center gap-1.5">
            <span className="inline-block w-1 h-1 rounded-full bg-accent" />
            <span>Katalog pencarian simulasi (integrasi API TMDB live di Phase 3).</span>
          </p>
        </div>

        {/* Search Results List */}
        {searchResults.length > 0 && (
          <div className="space-y-2 mt-3 pt-2 border-t border-line/40">
            <div className="text-[11px] font-mono uppercase tracking-wider text-muted">
              Hasil Ditemukan ({searchResults.length})
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {searchResults.map((item) => (
                <button
                  key={item.tmdb}
                  type="button"
                  onClick={() => handlePickResult(item)}
                  className="res cursor-pointer text-left w-full group"
                >
                  <div className="w-11 flex-none">
                    <PosterCover
                      title=""
                      identifier={item.tmdb}
                      className="w-11 !p-0 rounded"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-text font-medium text-sm group-hover:text-accent transition-colors truncate">
                      {item.title}
                    </div>
                    <div className="text-muted text-xs font-mono mt-0.5">
                      {item.year} · {item.runtime} menit
                    </div>
                  </div>
                  <span className="text-xs text-accent/80 font-medium px-2 py-1 rounded bg-accent-soft group-hover:bg-accent group-hover:text-[#121017] transition-all">
                    Pilih
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* No Results from query */}
        {trimmedQuery.length >= 2 && searchResults.length === 0 && (
          <div className="p-6 border border-dashed border-line rounded-xl text-center bg-surface/30 space-y-3">
            <p className="text-sm text-text-subtle">
              Tidak ada hasil untuk &quot;<strong className="text-text">{query}</strong>&quot; di katalog simulasi.
            </p>
            <button
              type="button"
              onClick={handleManual}
              className="btn primary text-xs sm:text-sm font-semibold"
            >
              Input &quot;{query}&quot; Secara Manual
            </button>
          </div>
        )}

        {/* Manual Fallback Trigger */}
        {!selectedMovie && trimmedQuery.length < 2 && (
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
              <span>Film tidak ada di katalog referensi? Masukkan secara manual</span>
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
                    <span className="text-[10px] font-mono uppercase tracking-wider text-accent bg-accent-soft px-2 py-0.5 rounded inline-block mb-1.5">
                      Dari Katalog Referensi #{selectedMovie.tmdb}
                    </span>
                    <h3 className="font-serif font-bold text-lg text-text">
                      {selectedMovie.title}
                    </h3>
                    <p className="text-muted text-xs font-mono mt-0.5">
                      {selectedMovie.year} · {selectedMovie.runtime} menit
                    </p>
                    <p className="mt-2 text-xs sm:text-sm text-text-subtle leading-relaxed line-clamp-3">
                      {selectedMovie.syn}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Step 3: Mood Assignment */}
          <div className="space-y-3 pt-2 border-t border-line/40">
            <div className="flex items-center justify-between">
              <label className="!mt-0 text-xs font-mono uppercase tracking-wider text-muted">
                3. Kurasi Mood <span className="text-danger">*</span>
              </label>
              <span className="text-[11px] text-muted">Minimal 1 mood</span>
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
                Belum ada mood tersimpan. Tambahkan mood baru di bawah ini.
              </p>
            )}

            {/* Custom Mood Addition */}
            <div className="flex items-center gap-2 pt-1.5">
              <input
                type="text"
                placeholder="+ Mood kustom (1-24 karakter)"
                value={newMoodName}
                onChange={(e) => setNewMoodName(e.target.value)}
                maxLength={24}
                className="max-w-[240px] text-xs py-2 px-3 bg-surface border border-line rounded-lg"
              />
              <button
                type="button"
                onClick={handleAddCustomMood}
                disabled={isAddingMood || !newMoodName.trim()}
                className="btn text-xs py-2 px-3 bg-surface-elevated font-medium"
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
    </div>
  );
}
