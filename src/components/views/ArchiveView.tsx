'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Movie } from '@/types';
import { PosterCover } from '@/components/PosterCover';
import { EmptyState } from '@/components/EmptyState';
import { Badge } from '@/components/Badge';
import { FilmStripDivider } from '@/components/FilmStripDivider';

interface ArchiveViewProps {
  initialMovies?: Movie[];
}

export function ArchiveView({ initialMovies = [] }: ArchiveViewProps) {
  const [movies] = useState<Movie[]>(initialMovies);

  // Filter movies that are watched AND have creative research logs,
  // sorted by content potential descending.
  const archivedMovies = useMemo(() => {
    return movies
      .filter((m) => m.done && m.log)
      .sort((a, b) => (b.log?.contentPotential || 0) - (a.log?.contentPotential || 0));
  }, [movies]);

  return (
    <div className="space-y-8 sm:space-y-10 pb-8">
      {/* ─────────────────────────────────────────────────────────────
          EDITORIAL ARCHIVE HEADER (Writer's Room Dossier)
         ───────────────────────────────────────────────────────────── */}
      <section className="border-b border-line/60 pb-6 sm:pb-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            {/* OSD Status Bar */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Badge variant="analysis" size="xs">
                DOSSIER ARCHIVE
              </Badge>
              <span className="text-[10px] font-pixel text-muted tracking-wider uppercase">
                THE WRITER&apos;S ROOM
              </span>
              <span className="text-[10px] font-pixel text-muted/60 tracking-wider ml-auto hidden sm:inline" aria-hidden="true">
                BERUANG SASTRA // RESEARCH LOG
              </span>
            </div>

            <h1 className="font-serif font-bold text-3xl sm:text-4xl text-text tracking-tight">
              Arsip Creator
            </h1>
            <p className="text-muted text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
              Koleksi film yang telah selesai ditonton, diprioritaskan berdasarkan potensi konten tertinggi
              untuk bahan video essay, ulasan mendalam, dan riset naratif Beruang Sastra.
            </p>
          </div>

          {archivedMovies.length > 0 && (
            <div className="flex-none self-start sm:self-auto bg-surface/80 px-3.5 py-2 rounded-xl border border-line shadow-xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-neon-magenta animate-pulse" />
              <span className="font-pixel text-[11px] text-text font-bold">
                {archivedMovies.length} ARSIP TERSIMPAN
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Film Strip Divider */}
      <FilmStripDivider label="RESEARCH LOGS // HIGH POTENTIAL" />

      {/* ─────────────────────────────────────────────────────────────
          ARCHIVE DOSSIERS LIST (Editorial Research Catalog)
         ───────────────────────────────────────────────────────────── */}
      <section aria-label="Daftar Arsip Riset Film">
        {archivedMovies.length > 0 ? (
          <div className="space-y-6">
            {archivedMovies.map((movie, index) => {
              const archiveCode = `DOSSIER #0${index + 1}`;

              return (
                <article
                  key={movie.id}
                  className="card p-5 sm:p-7 flex flex-col md:flex-row gap-6 items-start hover:border-primary/40 transition-all duration-200"
                >
                  {/* Poster Thumbnail Showcase */}
                  <div className="w-28 sm:w-36 flex-none self-start">
                    <Link
                      href={`/bank/${movie.id}`}
                      className="block rounded-xl overflow-hidden shadow-lg group/cover focus-visible:outline-2 focus-visible:outline-primary"
                      aria-label={`Buka detail film ${movie.title}`}
                    >
                      <PosterCover
                        title={movie.title}
                        identifier={movie.tmdbId || movie.id}
                        done={movie.done}
                        year={movie.year}
                        posterUrl={movie.posterUrl}
                        className="w-full transition-transform duration-300 group-hover/cover:scale-[1.02]"
                      />
                    </Link>
                  </div>

                  {/* Research Dossier Content */}
                  <div className="flex-1 min-w-0 space-y-4 w-full">
                    {/* Header Row: Dossier Code, Title & Ratings */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-[10px] font-pixel text-primary-bright mb-1">
                          <span>{archiveCode}</span>
                          <span>•</span>
                          <span>{movie.year || 'N/A'}</span>
                          {movie.runtime && (
                            <>
                              <span>•</span>
                              <span>{movie.runtime}m</span>
                            </>
                          )}
                        </div>

                        <Link
                          href={`/bank/${movie.id}`}
                          className="font-serif font-bold text-xl sm:text-2xl text-text hover:text-primary-bright transition-colors leading-tight inline-block"
                        >
                          {movie.title}
                        </Link>

                        {/* Mood Tags */}
                        {movie.moods && movie.moods.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            {movie.moods.map((mood) => (
                              <span
                                key={mood}
                                className="text-[10px] font-pixel px-2 py-0.5 rounded-md bg-surface-elevated text-lavender border border-line/60"
                              >
                                #{mood}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Score Badges */}
                      <div className="flex items-center gap-2 self-start flex-none">
                        <div className="bg-surface-elevated border border-line px-3 py-1.5 rounded-xl text-xs font-mono text-muted">
                          Rating <strong className="text-text font-bold">{movie.log?.rating}</strong>/10
                        </div>
                        <div className="bg-neon-magenta/15 border border-neon-magenta/35 px-3 py-1.5 rounded-xl text-xs font-mono text-neon-magenta font-semibold shadow-xs">
                          Potensi <strong className="text-neon-magenta font-bold">{movie.log?.contentPotential}</strong>/10
                        </div>
                      </div>
                    </div>

                    {/* Editorial Creative Research Fields */}
                    <div className="space-y-3 pt-1">
                      {/* Angle Konten Highlight */}
                      {movie.log?.angle && (
                        <div className="bg-surface-elevated/70 p-4 rounded-xl border border-line-subtle shadow-xs">
                          <span className="text-[10px] font-pixel uppercase tracking-wider text-neon-magenta block mb-1">
                            ANGLE KONTEN
                          </span>
                          <p className="text-text text-sm sm:text-[15px] font-medium leading-snug">
                            &ldquo;{movie.log.angle}&rdquo;
                          </p>
                        </div>
                      )}

                      {/* Theme and Scene Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {movie.log?.theme && (
                          <div className="p-3 rounded-lg bg-surface/50 border border-line/50">
                            <span className="font-pixel text-[9px] uppercase tracking-wider text-muted block mb-0.5">
                              TEMA SENTRAL:
                            </span>
                            <span className="text-text-subtle font-medium text-xs sm:text-[13px]">
                              {movie.log.theme}
                            </span>
                          </div>
                        )}

                        {movie.log?.scene && (
                          <div className="p-3 rounded-lg bg-surface/50 border border-line/50">
                            <span className="font-pixel text-[9px] uppercase tracking-wider text-muted block mb-0.5">
                              ADEGAN MEMBEKAS:
                            </span>
                            <span className="text-text-subtle font-medium text-xs sm:text-[13px]">
                              {movie.log.scene}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Analytical Notes */}
                      {movie.log?.notes && (
                        <div className="pt-1">
                          <p className="text-xs sm:text-sm text-muted line-clamp-3 leading-relaxed">
                            {movie.log.notes}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Footer Action Links */}
                    <div className="pt-3 border-t border-line/40 flex items-center justify-between text-xs">
                      <Link
                        href={`/bank/${movie.id}/catat`}
                        className="text-muted hover:text-text font-medium transition-colors flex items-center gap-1.5"
                      >
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none stroke-[2]" aria-hidden="true">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        <span>Edit Catatan Riset</span>
                      </Link>

                      <Link
                        href={`/bank/${movie.id}`}
                        className="text-primary-bright font-semibold hover:underline inline-flex items-center gap-1"
                      >
                        <span>Buka Dossier Lengkap</span>
                        <span aria-hidden="true">→</span>
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="Belum ada catatan di Writer's Room."
            description="Setelah menonton film, catat rating, angle konten, dan adegan yang membekas untuk membangun arsip riset lu."
            actionText="Jelajahi Movie Bank"
            actionHref="/bank"
            primaryAction
          />
        )}
      </section>
    </div>
  );
}
