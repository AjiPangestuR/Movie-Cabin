'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Movie } from '@/types';
import { useMovies } from '@/lib/useMovies';
import { saveLog } from '@/lib/movies';
import { NumberScale } from '@/components/NumberScale';
import { useToast } from '@/components/Toast';

interface CatatViewProps {
  id: number;
}

function CatatForm({ movie }: { movie: Movie }) {
  const router = useRouter();
  const { showToast } = useToast();

  const [rating, setRating] = useState<number | null>(movie.log?.rating ?? null);
  const [contentPotential, setContentPotential] = useState<number | null>(
    movie.log?.contentPotential ?? null
  );
  const [theme, setTheme] = useState(movie.log?.theme ?? '');
  const [scene, setScene] = useState(movie.log?.scene ?? '');
  const [angle, setAngle] = useState(movie.log?.angle ?? '');
  const [notes, setNotes] = useState(movie.log?.notes ?? '');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!rating || !contentPotential) {
      showToast('Isi rating dan potensi konten dulu.', true);
      return;
    }

    try {
      await saveLog(movie.id, {
        rating,
        contentPotential,
        theme,
        scene,
        angle,
        notes,
      });

      showToast('Catatan tersimpan.');
      router.push(`/bank/${movie.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan catatan.';
      showToast(msg, true);
    }
  };

  return (
    <div>
      <Link href={`/bank/${movie.id}`} className="link font-medium">
        Batal
      </Link>

      <h1 className="mt-3">{movie.title}</h1>
      <p className="muted">Catat sebelum kesannya hilang.</p>

      <form onSubmit={handleSave}>
        <div className="panel">
          <label className="!mt-0">
            Rating filmnya{' '}
            <span className="text-muted font-normal text-xs">(1 jelek, 10 mahakarya)</span>
          </label>
          <NumberScale
            value={rating}
            onChange={setRating}
            ariaLabelPrefix="Rating film"
          />

          <label className="mt-4">
            Potensi jadi konten{' '}
            <span className="text-muted font-normal text-xs">(1 susah diolah, 10 siap dibedah)</span>
          </label>
          <NumberScale
            value={contentPotential}
            onChange={setContentPotential}
            ariaLabelPrefix="Potensi konten"
          />

          <label htmlFor="f-theme">Tema</label>
          <input
            type="text"
            id="f-theme"
            placeholder="Misal: obsesi, kehilangan, mencari makna"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
          />

          <label htmlFor="f-scene">Adegan yang nempel</label>
          <input
            type="text"
            id="f-scene"
            placeholder="Adegan mana yang masih kebayang?"
            value={scene}
            onChange={(e) => setScene(e.target.value)}
          />

          <label htmlFor="f-angle">Angle konten</label>
          <input
            type="text"
            id="f-angle"
            placeholder="Pertanyaan atau sudut pandang untuk videonya"
            value={angle}
            onChange={(e) => setAngle(e.target.value)}
          />

          <label htmlFor="f-notes">Catatan bebas</label>
          <textarea
            id="f-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <button
          type="submit"
          className="btn primary w-full mt-4"
        >
          Simpan catatan
        </button>
      </form>
    </div>
  );
}

export function CatatView({ id }: CatatViewProps) {
  const { movies } = useMovies();
  const movie = movies.find((m) => m.id === id);

  if (!movie) {
    return (
      <div>
        <Link href="/bank" className="link font-medium">
          Kembali ke Bank
        </Link>
        <div className="mt-8 text-center">
          <p className="font-serif font-bold text-lg mb-2">Film tidak ditemukan.</p>
          <Link href="/bank" className="btn mt-4">
            Buka Movie Bank
          </Link>
        </div>
      </div>
    );
  }

  return <CatatForm movie={movie} />;
}
