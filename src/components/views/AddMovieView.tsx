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
      title: query,
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
    <div>
      <h1>Tambah film</h1>
      <p className="muted">Cari judulnya, cek hasilnya, lalu pilih mood.</p>

      {/* Search Input */}
      <input
        type="text"
        id="aq"
        placeholder="Ketik judul film"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Cari judul film"
        className="mt-4"
      />

      <p className="muted mt-1.5 text-xs">
        Contoh hasil pencarian (data simulasi, nanti dari TMDB).
      </p>

      {/* Search Results list */}
      <div id="res" className="mt-2 space-y-2">
        {searchResults.map((item) => (
          <button
            key={item.tmdb}
            type="button"
            onClick={() => handlePickResult(item)}
            className="res cursor-pointer text-left bg-surface"
          >
            <div className="w-[44px] flex-none">
              <PosterCover
                title=""
                identifier={item.tmdb}
                className="w-[44px] !p-0"
              />
            </div>
            <div>
              <b className="text-text block font-medium">{item.title}</b>
              <div className="text-muted text-xs">
                {item.year}, {item.runtime} menit
              </div>
            </div>
          </button>
        ))}

        {trimmedQuery.length >= 2 && searchResults.length === 0 && (
          <div className="mt-6 px-5 py-7 border border-dashed border-line rounded-[14px] text-center">
            <p className="text-text mb-3.5">Nggak ketemu &quot;{query}&quot;.</p>
            <button
              type="button"
              onClick={handleManual}
              className="btn"
            >
              Isi manual
            </button>
          </div>
        )}
      </div>

      {/* Manual link button if no movie selected */}
      {!selectedMovie ? (
        <p className="mt-3.5">
          <button
            type="button"
            onClick={handleManual}
            className="link font-medium"
          >
            Film nggak ada di hasil? Isi manual
          </button>
        </p>
      ) : (
        <form onSubmit={handleSave} className="mt-4">
          <div className="panel">
            <div className="flex items-start gap-4">
              <div className="w-24 flex-none">
                <PosterCover
                  title={selectedMovie.title}
                  identifier={selectedMovie.tmdb || 999}
                />
              </div>

              <div className="flex-1">
                {selectedMovie.manual ? (
                  <div>
                    <input
                      type="text"
                      placeholder="Judul"
                      value={selectedMovie.title}
                      onChange={(e) =>
                        setSelectedMovie((prev) =>
                          prev ? { ...prev, title: e.target.value } : null
                        )
                      }
                      aria-label="Judul"
                    />
                    <input
                      type="text"
                      placeholder="Tahun"
                      value={selectedMovie.year}
                      onChange={(e) =>
                        setSelectedMovie((prev) =>
                          prev ? { ...prev, year: e.target.value } : null
                        )
                      }
                      aria-label="Tahun"
                      className="mt-2"
                    />
                    <input
                      type="text"
                      placeholder="Sinopsis singkat"
                      value={selectedMovie.syn}
                      onChange={(e) =>
                        setSelectedMovie((prev) =>
                          prev ? { ...prev, syn: e.target.value } : null
                        )
                      }
                      aria-label="Sinopsis"
                      className="mt-2"
                    />
                  </div>
                ) : (
                  <div>
                    <h3 className="text-lg font-serif font-bold text-text">
                      {selectedMovie.title}
                    </h3>
                    <p className="text-muted text-sm mt-0.5">
                      {selectedMovie.year}, {selectedMovie.runtime} menit
                    </p>
                    <p className="mt-2 text-sm text-text leading-relaxed">
                      {selectedMovie.syn}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mood Section */}
          <label className="mt-4 block font-medium">
            Mood <span className="text-muted font-normal text-xs">(pilih satu atau lebih)</span>
          </label>
          <div className="mt-1">
            <MoodChips
              moods={availableMoods}
              selectedMoods={selectedMoods}
              onToggle={handleToggleMood}
              wrap
            />
          </div>

          {/* Input Mood Kustom Baru */}
          <div className="mt-3 flex items-center gap-2">
            <input
              type="text"
              placeholder="+ Mood kustom (1-24 karakter)"
              value={newMoodName}
              onChange={(e) => setNewMoodName(e.target.value)}
              maxLength={24}
              className="!w-auto flex-1 max-w-[260px] text-xs py-2 px-3 rounded-xl border border-line bg-surface"
            />
            <button
              type="button"
              onClick={handleAddCustomMood}
              disabled={isAddingMood || !newMoodName.trim()}
              className="btn text-xs py-2 px-3.5"
            >
              {isAddingMood ? 'Menambahkan...' : 'Tambah Mood'}
            </button>
          </div>

          {/* Watch URL */}
          <label htmlFor="au" className="mt-4 block font-medium">
            Tautan nonton <span className="text-muted font-normal text-xs">(opsional)</span>
          </label>
          <input
            type="text"
            id="au"
            placeholder="https://..."
            value={watchUrl}
            onChange={(e) => setWatchUrl(e.target.value)}
          />

          <button
            type="submit"
            disabled={saving}
            className="btn primary w-full mt-[18px]"
          >
            {saving ? 'Menyimpan ke Kabin...' : 'Simpan ke Kabin'}
          </button>
        </form>
      )}
    </div>
  );
}
