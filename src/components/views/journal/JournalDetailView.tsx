'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type JournalEntry } from '@/types';
import { MoodBadge } from './MoodSelector';
import { PosterCover } from '@/components/PosterCover';
import { ConfirmInline } from '@/components/ConfirmInline';
import { useToast } from '@/components/Toast';
import { deleteJournalAction } from '@/app/actions/journalActions';

interface JournalDetailViewProps {
  entry: JournalEntry;
}

function formatIndonesianDate(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return dateStr;

  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function calculateReadingStats(content: string) {
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const minutes = Math.max(1, Math.ceil(words / 180));
  return { words, minutes };
}

export function JournalDetailView({ entry }: JournalDetailViewProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPending, startTransition] = useTransition();

  const { words, minutes } = calculateReadingStats(entry.content);
  const formattedDate = formatIndonesianDate(entry.entryDate);

  const paragraphs = entry.content
    ? entry.content.split(/\n\s*\n/).filter((p) => p.trim().length > 0)
    : [];

  const handleDelete = () => {
    startTransition(async () => {
      const res = await deleteJournalAction(entry.id);
      if (res.success) {
        showToast('Jurnal berhasil dihapus dari rak rekaman.');
        router.push('/journal');
      } else {
        showToast(res.error || 'Gagal menghapus jurnal.', true);
        setIsDeleting(false);
      }
    });
  };

  return (
    <article
      data-testid="journal-detail-view"
      className="max-w-[760px] mx-auto space-y-8 sm:space-y-10 pb-16"
    >
      {/* ─────────────────────────────────────────────────────────────
          TOP NAVIGATION & BREADCRUMB
         ───────────────────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between gap-4 border-b border-line/60 pb-4">
        <Link
          href="/journal"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-muted hover:text-text transition-colors"
        >
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
            <path d="M9.78 12.78a.75.75 0 0 1-1.06 0L4.47 8.53a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 1.06L6.06 8l3.72 3.72a.75.75 0 0 1 0 1.06z" />
          </svg>
          <span>Kembali ke Jurnal</span>
        </Link>

        <div className="flex items-center gap-2">
          {entry.isDraft ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-pixel uppercase bg-amber/15 text-amber border border-amber/35">
              <span className="w-1.5 h-1.5 rounded-full bg-amber animate-pulse" />
              DRAFT
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-pixel uppercase bg-primary/15 text-primary-bright border border-primary/30">
              PUBLISHED
            </span>
          )}

          <Link
            href={`/journal/${entry.id}/edit`}
            className="px-3.5 py-1.5 rounded-lg border border-line bg-surface text-xs font-medium text-text hover:bg-surface-elevated hover:border-primary/40 transition-colors"
          >
            Edit Jurnal
          </Link>
        </div>
      </nav>

      {/* ─────────────────────────────────────────────────────────────
          EDITORIAL HEADER
         ───────────────────────────────────────────────────────────── */}
      <header className="space-y-4">
        {/* OSD Tape Index & Date */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs text-muted">
          <span className="font-pixel text-[10px] text-muted/70 tracking-wider">
            TAPE: {entry.entryDate.replace(/-/g, '.')}
          </span>
          <span>•</span>
          <time dateTime={entry.entryDate} className="font-medium text-text-subtle">
            {formattedDate}
          </time>
          {entry.mood && (
            <>
              <span>•</span>
              <MoodBadge mood={entry.mood} size="xs" />
            </>
          )}
        </div>

        {/* Headline */}
        <h1 className="font-serif font-bold text-3xl sm:text-5xl text-text tracking-tight leading-tight">
          {entry.title}
        </h1>

        {/* Read stats & tags */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-muted border-t border-line/40">
          <div className="flex items-center gap-2">
            <span>{words} kata</span>
            <span>•</span>
            <span>{minutes} menit membaca</span>
          </div>

          {entry.tags && entry.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {entry.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded text-[11px] font-mono bg-surface border border-line/60 text-muted"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          EDITORIAL PROSE / NARRATIVE BODY
         ───────────────────────────────────────────────────────────── */}
      <section className="prose max-w-none text-text-subtle font-sans leading-relaxed text-base sm:text-lg space-y-6">
        {paragraphs.length > 0 ? (
          paragraphs.map((para, idx) => (
            <p key={idx} className="whitespace-pre-line leading-relaxed">
              {para}
            </p>
          ))
        ) : (
          <div className="p-6 rounded-2xl border border-dashed border-line bg-surface/40 text-center italic text-muted">
            Entri draf ini belum memiliki catatan teks tertulis.
          </div>
        )}
      </section>

      {/* ─────────────────────────────────────────────────────────────
          ATTACHED MOVIES & RESONANCE NOTES
         ───────────────────────────────────────────────────────────── */}
      {entry.relatedMovies && entry.relatedMovies.length > 0 && (
        <section className="pt-8 border-t border-line/60 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-pixel text-primary-bright tracking-widest uppercase">
              RESONANSI SINEMA
            </span>
            <div className="h-px flex-1 bg-line/60" />
          </div>

          <h3 className="font-serif font-bold text-xl sm:text-2xl text-text">
            Film Terkait Hari Ini
          </h3>

          <div className="space-y-4">
            {entry.relatedMovies.map((relation) => (
              <div
                key={relation.id}
                className="p-4 sm:p-5 rounded-2xl border border-line bg-surface/70 flex flex-col sm:flex-row items-start gap-4 sm:gap-5"
              >
                {/* Poster Thumbnail */}
                <div className="w-20 sm:w-24 flex-none">
                  <PosterCover
                    title={relation.movie?.title || 'Film'}
                    year={relation.movie?.year}
                    posterUrl={relation.movie?.posterUrl}
                    className="shadow-sm"
                  />
                </div>

                {/* Movie Details & Resonance Note */}
                <div className="flex-1 space-y-2.5">
                  <div>
                    <h4 className="font-serif font-bold text-lg sm:text-xl text-text">
                      {relation.movie?.title}
                    </h4>
                    <p className="text-xs text-muted">
                      {relation.movie?.year} • {relation.movie?.runtime} menit
                    </p>
                  </div>

                  {relation.resonanceNote && (
                    <blockquote className="border-l-2 border-primary/60 pl-3.5 py-1 text-xs sm:text-sm italic text-text-subtle font-serif bg-surface/40 rounded-r-lg">
                      &ldquo;{relation.resonanceNote}&rdquo;
                    </blockquote>
                  )}

                  <div className="pt-1">
                    <Link
                      href={`/bank/${relation.movieId}`}
                      className="text-xs font-medium text-primary-bright hover:underline inline-flex items-center gap-1"
                    >
                      <span>Buka Catatan Film di Movie Bank</span>
                      <svg viewBox="0 0 16 16" className="w-3 h-3 fill-current" aria-hidden="true">
                        <path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06z" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────
          BOTTOM ACTIONS & DELETE CONFIRMATION
         ───────────────────────────────────────────────────────────── */}
      <footer className="pt-8 border-t border-line/60 flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/journal"
          className="text-xs sm:text-sm text-muted hover:text-text transition-colors"
        >
          ← Kembali ke Aliran Jurnal
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href={`/journal/${entry.id}/edit`}
            className="px-4 py-2 rounded-xl border border-line bg-surface text-xs sm:text-sm font-medium text-text hover:bg-surface-elevated hover:border-primary/40 transition-colors"
          >
            Edit Jurnal
          </Link>

          <ConfirmInline
            isConfirming={isDeleting}
            onInitiate={() => setIsDeleting(true)}
            onConfirm={handleDelete}
            onCancel={() => setIsDeleting(false)}
            promptText="Hapus entri jurnal ini selamanya?"
            confirmText={isPending ? 'Menghapus...' : 'Ya, hapus jurnal'}
            cancelText="Batal"
            triggerText="Hapus Jurnal"
          />
        </div>
      </footer>
    </article>
  );
}
