'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Movie } from '@/types';
import { PosterCover } from '@/components/PosterCover';
import { EmptyState } from '@/components/EmptyState';

interface ArchiveViewProps {
  initialMovies?: Movie[];
}

export function ArchiveView({ initialMovies = [] }: ArchiveViewProps) {
  const [movies] = useState<Movie[]>(initialMovies);

  const archivedMovies = useMemo(() => {
    return movies
      .filter((m) => m.done && m.log)
      .sort((a, b) => (b.log?.contentPotential || 0) - (a.log?.contentPotential || 0));
  }, [movies]);

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* Editorial Header */}
      <section className="border-b border-line/60 pb-6">
        <div className="flex items-center gap-2 mb-2 text-xs font-mono tracking-widest uppercase text-muted/70">
          <span>The Writer&apos;s Room</span>
          <span className="text-muted/30">/</span>
          <span>Bank Ide & Riset</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <h1 className="font-serif font-bold text-3xl sm:text-4xl text-text tracking-tight">
            Arsip Creator
          </h1>
          {archivedMovies.length > 0 && (
            <span className="text-xs font-mono text-muted">
              {archivedMovies.length} film dengan catatan riset
            </span>
          )}
        </div>
        <p className="text-muted text-sm mt-1 max-w-xl leading-relaxed">
          Koleksi film yang telah selesai ditonton, diprioritaskan berdasarkan potensi konten tertinggi untuk bahan video essay dan ulasan Beruang Sastra.
        </p>
      </section>

      {/* Archive Dossiers List */}
      <section>
        {archivedMovies.length > 0 ? (
          <div className="space-y-5">
            {archivedMovies.map((movie) => (
              <article
                key={movie.id}
                className="group panel bg-surface/50 border border-line hover:border-line-subtle transition-all duration-200 rounded-xl p-4 sm:p-6"
              >
                <div className="flex flex-col sm:flex-row gap-5 items-start">
                  {/* Poster Thumbnail */}
                  <Link
                    href={`/bank/${movie.id}`}
                    className="w-24 sm:w-28 flex-none self-start focus-visible:ring-2 focus-visible:ring-accent rounded-lg overflow-hidden group-hover:scale-[1.02] transition-transform duration-200"
                  >
                    <PosterCover
                      title={movie.title}
                      identifier={movie.tmdbId || movie.id}
                      done={movie.done}
                      year={movie.year}
                      className="w-full"
                    />
                  </Link>

                  {/* Content / Research Record */}
                  <div className="flex-1 min-w-0 space-y-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div>
                        <Link
                          href={`/bank/${movie.id}`}
                          className="font-serif font-bold text-xl sm:text-2xl text-text hover:text-accent transition-colors leading-tight inline-block"
                        >
                          {movie.title}
                        </Link>
                        <div className="text-xs font-mono text-muted mt-1 flex items-center gap-2">
                          {movie.year && <span>{movie.year}</span>}
                          {movie.runtime && (
                            <>
                              <span className="text-line">·</span>
                              <span>{movie.runtime}m</span>
                            </>
                          )}
                          {movie.moods && movie.moods.length > 0 && (
                            <>
                              <span className="text-line">·</span>
                              <span>{movie.moods.join(', ')}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Ratings */}
                      <div className="flex items-center gap-2 self-start flex-none">
                        <div className="bg-bg/80 border border-line px-2.5 py-1 rounded text-xs font-mono text-muted">
                          Rating <strong className="text-text">{movie.log?.rating}</strong>/10
                        </div>
                        <div className="bg-accent/10 border border-accent/30 px-2.5 py-1 rounded text-xs font-mono text-accent font-medium">
                          Potensi <strong className="text-accent">{movie.log?.contentPotential}</strong>/10
                        </div>
                      </div>
                    </div>

                    {/* Creative Research Fields */}
                    <div className="space-y-2.5 pt-1">
                      {movie.log?.angle && (
                        <div className="bg-bg/40 p-3 rounded-lg border border-line/40">
                          <span className="text-[11px] font-mono uppercase tracking-wider text-accent block mb-0.5">
                            Angle Konten
                          </span>
                          <p className="text-text text-sm font-medium leading-snug">
                            {movie.log.angle}
                          </p>
                        </div>
                      )}

                      {movie.log?.theme && (
                        <div className="text-xs text-muted">
                          <span className="font-mono uppercase tracking-wider text-muted/70">Tema: </span>
                          <span className="text-text-subtle">{movie.log.theme}</span>
                        </div>
                      )}

                      {movie.log?.scene && (
                        <div className="text-xs text-muted">
                          <span className="font-mono uppercase tracking-wider text-muted/70">Adegan Nempel: </span>
                          <span className="text-text-subtle">{movie.log.scene}</span>
                        </div>
                      )}

                      {movie.log?.notes && (
                        <p className="text-xs sm:text-sm text-muted line-clamp-2 leading-relaxed pt-1">
                          {movie.log.notes}
                        </p>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-2 flex items-center justify-between text-xs">
                      <Link
                        href={`/bank/${movie.id}/catat`}
                        className="text-muted hover:text-accent font-medium transition-colors"
                      >
                        Edit Catatan
                      </Link>
                      <Link
                        href={`/bank/${movie.id}`}
                        className="text-accent hover:underline font-medium inline-flex items-center gap-1"
                      >
                        <span>Buka Dossier Film</span>
                        <svg viewBox="0 0 16 16" className="w-3 h-3 fill-current" aria-hidden="true">
                          <path fillRule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Belum ada catatan di Writer's Room."
            description="Setelah menonton film, catat rating, angle konten, dan adegan yang membekas untuk membangun arsip riset lu."
            actionText="Jelajahi Movie Bank"
            actionHref="/bank"
          />
        )}
      </section>
    </div>
  );
}
