'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useMovies } from '@/lib/useMovies';
import { PosterCover } from '@/components/PosterCover';
import { EmptyState } from '@/components/EmptyState';

export function ArchiveView() {
  const { movies, loading } = useMovies();

  const archivedMovies = useMemo(() => {
    return movies
      .filter((m) => m.done && m.log)
      .sort((a, b) => (b.log?.contentPotential || 0) - (a.log?.contentPotential || 0));
  }, [movies]);

  if (loading) {
    return (
      <div>
        <h1>Arsip</h1>
        <p className="muted">Memuat arsip film...</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Arsip</h1>
      <p className="muted">Film yang sudah ditonton, diurutkan dari potensi konten tertinggi.</p>

      {archivedMovies.length > 0 ? (
        <div className="space-y-4 mt-4">
          {archivedMovies.map((movie) => (
            <Link
              key={movie.id}
              href={`/bank/${movie.id}`}
              className="panel !mt-0 flex gap-3.5 transition-colors hover:border-accent/40 block w-full text-left"
            >
              <div className="w-16 flex-none">
                <PosterCover
                  title={movie.title}
                  identifier={movie.tmdbId || movie.id}
                  done={movie.done}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-serif font-bold text-lg text-text leading-[1.3] truncate">
                  {movie.title}
                </div>
                <div className="score">
                  <div>
                    Rating <b>{movie.log?.rating}</b>/10
                  </div>
                  <div>
                    Potensi{' '}
                    <b className="text-accent">{movie.log?.contentPotential}</b>/10
                  </div>
                </div>
                {movie.log?.angle && (
                  <p className="text-muted text-sm mt-2 line-clamp-2">
                    {movie.log.angle}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Belum ada catatan."
          description="Setelah selesai nonton, catat ide dan angle-nya di sini."
          actionText="Buka Movie Bank"
          actionHref="/bank"
        />
      )}
    </div>
  );
}
