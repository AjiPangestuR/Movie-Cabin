'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Movie } from '@/types';
import { updateMovieMoods, deleteMovie } from '@/lib/movies';
import { PosterCover } from '@/components/PosterCover';
import { MoodChips } from '@/components/MoodChips';
import { ConfirmInline } from '@/components/ConfirmInline';
import { useToast } from '@/components/Toast';

interface MovieDetailViewProps {
  initialMovie: Movie;
  initialMoods?: string[];
}

export function MovieDetailView({ initialMovie, initialMoods = [] }: MovieDetailViewProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [movie, setMovie] = useState<Movie>(initialMovie);
  const [availableMoods] = useState<string[]>(initialMoods);
  const [isDeleting, setIsDeleting] = useState(false);

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
      const updated = await updateMovieMoods(movie.id, nextMoods);
      setMovie(updated);
      showToast('Mood berhasil diperbarui.');
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
        { label: 'Tema Utama', value: movie.log.theme },
        { label: 'Adegan yang Nempel', value: movie.log.scene },
        { label: 'Angle Konten / Sudut Pandang', value: movie.log.angle },
        { label: 'Catatan Bebas', value: movie.log.notes },
      ].filter((x) => x.value && x.value.trim().length > 0)
    : [];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb">
        <Link
          href="/bank"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-muted hover:text-accent transition-colors font-medium group"
        >
          <svg
            viewBox="0 0 16 16"
            className="w-3.5 h-3.5 fill-current transition-transform group-hover:-translate-x-0.5"
            aria-hidden="true"
          >
            <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z" />
          </svg>
          <span>Kembali ke Movie Bank</span>
        </Link>
      </nav>

      {/* Main Dossier Grid */}
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] lg:grid-cols-[320px_1fr] gap-8 items-start">
        {/* Left Column: Poster Anchor & Direct Actions */}
        <div className="space-y-5">
          <div className="sticky top-24">
            <PosterCover
              title={movie.title}
              identifier={movie.tmdbId || movie.id}
              done={movie.done}
              year={movie.year}
              big
            />

            {/* Quick Actions Panel */}
            <div className="mt-5 space-y-2.5 pt-4 border-t border-line/60">
              {hasSafeWatchUrl ? (
                <a
                  className="btn primary w-full text-center text-sm font-semibold flex items-center justify-center gap-2"
                  href={movie.watchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  <span>Buka Tautan Nonton</span>
                </a>
              ) : (
                <button
                  type="button"
                  className="btn w-full text-center text-xs sm:text-sm text-muted/60 bg-surface/40"
                  disabled
                >
                  Belum ada tautan nonton
                </button>
              )}

              <Link
                href={`/bank/${movie.id}/catat`}
                className="btn w-full text-center text-xs sm:text-sm font-medium flex items-center justify-center gap-2"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-[2]" aria-hidden="true">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <span>{movie.done ? 'Edit Catatan Riset' : 'Catat Setelah Nonton'}</span>
              </Link>

              <div className="pt-2 flex justify-center">
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

        {/* Right Column: Editorial Record / Dossier Content */}
        <div className="space-y-7">
          {/* Film Identity & Status */}
          <section className="border-b border-line/60 pb-6">
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium tracking-wide ${
                  movie.done
                    ? 'bg-ok/15 text-ok border border-ok/30'
                    : 'bg-surface-elevated text-muted border border-line'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${movie.done ? 'bg-ok' : 'bg-muted/60'}`} />
                <span>{movie.done ? 'Sudah Ditonton' : 'Belum Ditonton'}</span>
              </span>

              {movie.tmdbId && (
                <span className="text-[11px] font-mono text-muted/60 border border-line-subtle px-2 py-0.5 rounded">
                  TMDB #{movie.tmdbId}
                </span>
              )}
            </div>

            <h1 className="font-serif font-bold text-2xl sm:text-3xl lg:text-4xl text-text tracking-tight leading-tight">
              {movie.title}
            </h1>

            {/* Metadata Ledger */}
            <div className="mt-3 flex items-center gap-2 sm:gap-3 text-xs sm:text-sm font-mono text-muted flex-wrap">
              {movie.year && (
                <>
                  <span className="text-text-subtle font-medium">{movie.year}</span>
                  <span className="text-line">/</span>
                </>
              )}
              {movie.runtime && (
                <>
                  <span>{movie.runtime} menit</span>
                  <span className="text-line">/</span>
                </>
              )}
              <span>Format Digital</span>
            </div>
          </section>

          {/* Mood Assignment Section */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-mono uppercase tracking-widest text-muted">
                Kurasi Suasana / Mood
              </h2>
              <span className="text-[11px] text-muted/60">Ketuk untuk ubah</span>
            </div>
            <MoodChips
              moods={availableMoods.length > 0 ? availableMoods : movie.moods}
              selectedMoods={movie.moods}
              onToggle={handleToggleMood}
              wrap
            />
          </section>

          {/* Synopsis Section */}
          <section className="space-y-2">
            <h2 className="text-xs font-mono uppercase tracking-widest text-muted">
              Sinopsis
            </h2>
            <div className="text-text/90 text-sm sm:text-base leading-relaxed max-w-2xl bg-surface/30 p-4 sm:p-5 rounded-xl border border-line/50">
              {movie.synopsis ? (
                <p>{movie.synopsis}</p>
              ) : (
                <p className="text-muted italic">Belum ada sinopsis untuk film ini.</p>
              )}
            </div>
          </section>

          {/* Watch & Source URL Reference */}
          {hasSafeWatchUrl && (
            <section className="space-y-2">
              <h2 className="text-xs font-mono uppercase tracking-widest text-muted">
                Tautan Akses
              </h2>
              <div className="flex items-center gap-2 text-xs text-muted truncate bg-surface/40 px-3.5 py-2.5 rounded-lg border border-line/60">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none stroke-[2] flex-none" aria-hidden="true">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                <a
                  href={movie.watchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link truncate text-accent"
                >
                  {movie.watchUrl}
                </a>
              </div>
            </section>
          )}

          {/* Creator Archive Research Notes */}
          {movie.done && movie.log ? (
            <section className="border border-line rounded-xl bg-surface/50 p-5 sm:p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-line/60 pb-3.5">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-widest text-accent font-medium">
                    The Writer&apos;s Room
                  </span>
                  <h3 className="font-serif font-semibold text-lg sm:text-xl text-text mt-0.5">
                    Catatan Creator Archive
                  </h3>
                </div>

                <Link
                  href={`/bank/${movie.id}/catat`}
                  className="text-xs text-muted hover:text-accent font-medium transition-colors"
                >
                  Edit Catatan
                </Link>
              </div>

              {/* Score indicators */}
              <div className="grid grid-cols-2 gap-3 max-w-sm">
                <div className="bg-bg/90 p-3.5 rounded-lg border border-line">
                  <span className="text-xs text-muted block">Rating Film</span>
                  <div className="font-serif font-bold text-2xl text-text mt-0.5">
                    {movie.log.rating}
                    <span className="text-xs font-sans font-normal text-muted/60 ml-1">/10</span>
                  </div>
                </div>
                <div className="bg-bg/90 p-3.5 rounded-lg border border-line">
                  <span className="text-xs text-muted block">Potensi Konten</span>
                  <div className="font-serif font-bold text-2xl text-accent mt-0.5">
                    {movie.log.contentPotential}
                    <span className="text-xs font-sans font-normal text-muted/60 ml-1">/10</span>
                  </div>
                </div>
              </div>

              {/* Research Fields */}
              <div className="space-y-4 pt-1">
                {notesList.map((item) => (
                  <div key={item.label} className="space-y-1">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted">
                      {item.label}
                    </span>
                    <p className="text-text text-sm sm:text-[15px] leading-relaxed whitespace-pre-line bg-bg/50 p-3.5 rounded-lg border border-line/50">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <section className="rounded-xl border border-dashed border-line/60 bg-surface/20 p-5 text-center">
              <p className="text-sm text-muted">
                Belum ada catatan riset untuk film ini. Selesai menonton?
              </p>
              <Link
                href={`/bank/${movie.id}/catat`}
                className="btn primary mt-3 text-xs sm:text-sm font-semibold"
              >
                Catat Ide & Review Sekarang
              </Link>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
