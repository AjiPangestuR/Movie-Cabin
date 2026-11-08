'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { type JournalEntry } from '@/types';
import { MoodBadge } from './MoodSelector';

interface JournalCardProps {
  entry: JournalEntry;
  className?: string;
  showActions?: boolean;
}

/**
 * Format tanggal dalam format bahasa Indonesia yang hangat dan editorial
 */
function formatIndonesianDate(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return dateStr;

  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/**
 * Hitung perkiraan jumlah kata dan waktu baca
 */
function calculateReadingStats(content: string) {
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const minutes = Math.max(1, Math.ceil(words / 180));
  return { words, minutes };
}

export function JournalCard({ entry, className = '', showActions = true }: JournalCardProps) {
  const { words, minutes } = calculateReadingStats(entry.content);
  const formattedDate = formatIndonesianDate(entry.entryDate);
  const primaryMovieRelation = entry.relatedMovies && entry.relatedMovies.length > 0 ? entry.relatedMovies[0] : null;

  return (
    <article
      data-testid="journal-card"
      className={`group relative rounded-2xl border border-line bg-surface/80 p-5 sm:p-6 transition-all duration-200 hover:border-primary/40 hover:bg-surface-elevated/70 hover:shadow-lg hover:shadow-primary/5 ${
        entry.isDraft ? 'border-dashed border-amber/40 bg-surface/50' : ''
      } ${className}`}
    >
      {/* ─────────────────────────────────────────────────────────────
          TOP OSD & METADATA BAR
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3.5">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Badge */}
          {entry.isDraft ? (
            <span
              data-testid="badge-draft"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-pixel tracking-wider uppercase bg-amber/15 text-amber border border-amber/35"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse" />
              DRAFT
            </span>
          ) : (
            <span
              data-testid="badge-published"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-pixel tracking-wider uppercase bg-primary/10 text-primary-bright border border-primary/25"
            >
              PUBLISHED
            </span>
          )}

          {/* Date Label */}
          <time
            dateTime={entry.entryDate}
            className="text-xs sm:text-sm font-medium text-text-subtle tracking-tight"
          >
            {formattedDate}
          </time>

          {/* Tape Index Counter */}
          <span className="text-[10px] font-pixel text-muted/60 tracking-wider hidden sm:inline" aria-hidden="true">
            TAPE: {entry.entryDate.replace(/-/g, '.')}
          </span>
        </div>

        {/* Mood Badge */}
        {entry.mood && <MoodBadge mood={entry.mood} size="xs" />}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          EDITORIAL TITLE
         ───────────────────────────────────────────────────────────── */}
      <h2 className="font-serif font-bold text-xl sm:text-2xl text-text tracking-tight mb-2.5 group-hover:text-primary-bright transition-colors">
        <Link href={`/journal/${entry.id}`} className="hover:underline focus:outline-hidden">
          {entry.title}
        </Link>
      </h2>

      {/* ─────────────────────────────────────────────────────────────
          CONTENT EXCERPT
         ───────────────────────────────────────────────────────────── */}
      <p className="text-muted text-sm sm:text-base leading-relaxed line-clamp-3 mb-4 font-sans">
        {entry.content.trim() ? (
          entry.content
        ) : (
          <span className="italic text-muted/60">
            (Draf kosong — belum ada catatan tertulis)
          </span>
        )}
      </p>

      {/* ─────────────────────────────────────────────────────────────
          ATTACHED MOVIE PILL (IF AVAILABLE)
         ───────────────────────────────────────────────────────────── */}
      {primaryMovieRelation && primaryMovieRelation.movie && (
        <div
          data-testid="journal-movie-pill"
          className="mb-4 inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-line bg-surface-elevated/80 max-w-full text-xs text-text-subtle"
        >
          {primaryMovieRelation.movie.posterPath ? (
            <div className="relative w-5 h-7 rounded overflow-hidden flex-none bg-surface border border-line">
              <Image
                src={`https://image.tmdb.org/t/p/w92${primaryMovieRelation.movie.posterPath}`}
                alt=""
                fill
                unoptimized
                className="object-cover"
              />
            </div>
          ) : (
            <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-2 text-primary flex-none" aria-hidden="true">
              <rect x="2" y="2" width="20" height="20" rx="2" />
              <line x1="7" y1="2" x2="7" y2="22" />
              <line x1="17" y1="2" x2="17" y2="22" />
              <line x1="2" y1="12" x2="22" y2="12" />
            </svg>
          )}

          <span className="truncate font-medium text-text">
            {primaryMovieRelation.movie.title}{' '}
            <span className="text-muted font-normal">
              ({primaryMovieRelation.movie.year})
            </span>
          </span>

          {primaryMovieRelation.resonanceNote && (
            <span className="text-muted/70 truncate hidden sm:inline italic max-w-xs border-l border-line pl-2">
              &ldquo;{primaryMovieRelation.resonanceNote}&rdquo;
            </span>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAGS CHIPS
         ───────────────────────────────────────────────────────────── */}
      {entry.tags && entry.tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-4" data-testid="journal-tags">
          {entry.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono text-muted bg-surface border border-line/60 hover:border-line hover:text-text transition-colors"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          CARD FOOTER (STATS & ACTIONS)
         ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-3 border-t border-line/50 text-xs text-muted">
        <div className="flex items-center gap-2">
          <span>{words} kata</span>
          <span>•</span>
          <span>{minutes} mnt baca</span>
        </div>

        <div className="flex items-center gap-3">
          {showActions && (
            <Link
              href={`/journal/${entry.id}/edit`}
              className="text-muted hover:text-primary-bright transition-colors font-medium text-xs px-2 py-1 rounded hover:bg-surface-elevated"
              title="Edit Jurnal"
            >
              Edit
            </Link>
          )}

          <Link
            href={`/journal/${entry.id}`}
            className="inline-flex items-center gap-1 font-medium text-primary-bright hover:text-lavender transition-colors"
          >
            <span>{entry.isDraft ? 'Lanjutkan' : 'Buka'}</span>
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current transition-transform group-hover:translate-x-0.5" aria-hidden="true">
              <path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06z" />
            </svg>
          </Link>
        </div>
      </div>
    </article>
  );
}
