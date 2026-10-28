'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMovies } from '@/lib/useMovies';
import { updateMovieMoods, deleteMovie } from '@/lib/movies';
import { PosterCover } from '@/components/PosterCover';
import { MoodChips } from '@/components/MoodChips';
import { ConfirmInline } from '@/components/ConfirmInline';
import { useToast } from '@/components/Toast';

interface MovieDetailViewProps {
  id: number;
}

export function MovieDetailView({ id }: MovieDetailViewProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const { movies } = useMovies();
  const [isDeleting, setIsDeleting] = useState(false);

  const movie = movies.find((m) => m.id === id);

  if (!movie) {
    return (
      <div>
        <Link href="/bank" className="link font-medium">
          Kembali ke Bank
        </Link>
        <div className="mt-8 text-center">
          <p className="font-serif font-bold text-lg mb-2">Film tidak ditemukan.</p>
          <p className="text-muted text-sm mb-4">Film dengan ID ini tidak ada di koleksi Kabin.</p>
          <Link href="/bank" className="btn">
            Buka Movie Bank
          </Link>
        </div>
      </div>
    );
  }

  const handleToggleMood = async (mood: string) => {
    const isExisting = movie.moods.includes(mood);
    if (isExisting && movie.moods.length === 1) {
      showToast('Minimal satu mood.', true);
      return;
    }

    const nextMoods = isExisting
      ? movie.moods.filter((m) => m !== mood)
      : [...movie.moods, mood];

    try {
      await updateMovieMoods(movie.id, nextMoods);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui mood.';
      showToast(msg, true);
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      const title = movie.title;
      await deleteMovie(movie.id);
      showToast(`"${title}" dihapus dari Kabin.`);
      router.push('/bank');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus film.';
      showToast(msg, true);
    }
  };

  const hasSafeWatchUrl = /^https?:\/\/\S+$/i.test(movie.watchUrl || '');

  const notesList = movie.log
    ? [
        { label: 'Tema', value: movie.log.theme },
        { label: 'Adegan yang nempel', value: movie.log.scene },
        { label: 'Angle konten', value: movie.log.angle },
        { label: 'Catatan', value: movie.log.notes },
      ].filter((x) => x.value && x.value.trim().length > 0)
    : [];

  return (
    <div>
      <Link href="/bank" className="link font-medium">
        Kembali ke Bank
      </Link>

      <div className="grid grid-cols-1 min-[700px]:grid-cols-[240px_1fr] gap-6 mt-3.5">
        {/* Left Column: Big Poster */}
        <div>
          <PosterCover
            title={movie.title}
            identifier={movie.tmdbId || movie.id}
            done={movie.done}
            big
          />
        </div>

        {/* Right Column: Metadata & Details */}
        <div>
          <h1>{movie.title}</h1>
          <p className="muted">
            {movie.year}, {movie.runtime} menit.{' '}
            {movie.done ? 'Sudah ditonton' : 'Belum ditonton'}.
          </p>

          <p className="muted mt-3.5">Mood (ketuk untuk ubah)</p>
          <div className="mt-1">
            <MoodChips
              selectedMoods={movie.moods}
              onToggle={handleToggleMood}
              wrap
            />
          </div>

          <p className="mt-3 text-text leading-relaxed">{movie.synopsis}</p>

          {/* Creator Archive Log Panel */}
          {movie.done && movie.log && (
            <div className="panel">
              <h3 className="text-lg">Catatan Creator Archive</h3>
              <div className="score">
                <div>
                  Rating <b>{movie.log.rating}</b>/10
                </div>
                <div>
                  Potensi konten{' '}
                  <b className="text-accent">{movie.log.contentPotential}</b>/10
                </div>
              </div>

              {notesList.map((item) => (
                <p key={item.label} className="mt-2.5 text-sm">
                  <span className="text-muted">{item.label}</span>
                  <br />
                  <span className="text-text">{item.value}</span>
                </p>
              ))}
            </div>
          )}

          {/* Actions Row */}
          <div className="flex items-center gap-3 flex-wrap mt-[22px]">
            {hasSafeWatchUrl ? (
              <a
                className="btn primary"
                href={movie.watchUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Tonton
              </a>
            ) : (
              <button type="button" className="btn" disabled>
                Belum ada tautan tonton
              </button>
            )}

            <Link
              href={`/bank/${movie.id}/catat`}
              className="btn"
            >
              {movie.done ? 'Edit catatan' : 'Udah kelar nonton'}
            </Link>

            <ConfirmInline
              isConfirming={isDeleting}
              onInitiate={() => setIsDeleting(true)}
              onConfirm={handleDeleteConfirm}
              onCancel={() => setIsDeleting(false)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
