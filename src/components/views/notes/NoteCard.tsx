'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { type PersonalNote } from '@/types';
import { ConfirmInline } from '@/components/ConfirmInline';

interface NoteCardProps {
  note: PersonalNote;
  onTogglePin?: (id: string, currentPinned: boolean) => void;
  onDelete?: (id: string) => void;
  className?: string;
}

function formatNoteDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function NoteCard({
  note,
  onTogglePin,
  onDelete,
  className = '',
}: NoteCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPending, startTransition] = useTransition();

  const formattedDate = formatNoteDate(note.updatedAt || note.createdAt);
  const hasTitle = Boolean(note.title && note.title.trim().length > 0);

  const handlePinClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onTogglePin) {
      onTogglePin(note.id, note.isPinned);
    }
  };

  const handleConfirmDelete = () => {
    startTransition(() => {
      if (onDelete) {
        onDelete(note.id);
      }
    });
  };

  return (
    <article
      data-testid="note-card"
      className={`group relative rounded-2xl border p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 ${
        note.isPinned
          ? 'bg-surface-elevated/90 border-amber/40 shadow-md shadow-amber/5 hover:border-amber/60'
          : 'bg-surface/70 border-line hover:border-primary/40 hover:bg-surface-elevated/70 hover:shadow-lg hover:shadow-primary/5'
      } ${className}`}
    >
      <div>
        {/* ─────────────────────────────────────────────────────────────
            TOP METADATA & PIN STATUS
           ───────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {note.isPinned ? (
              <span
                data-testid="note-pinned-badge"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-pixel uppercase bg-amber/15 text-amber border border-amber/35"
              >
                <svg viewBox="0 0 16 16" className="w-3 h-3 fill-current flex-none" aria-hidden="true">
                  <path d="M4.146.146A.5.5 0 0 1 4.5 0h7a.5.5 0 0 1 .5.5c0 .68-.342 1.174-.646 1.479-.283.282-.5.503-.5.917v1.894l1.435.956a.5.5 0 0 1 .211.414v1.5a.5.5 0 0 1-.5.5h-4v7.5a.5.5 0 0 1-1 0V8.26h-4a.5.5 0 0 1-.5-.5v-1.5a.5.5 0 0 1 .211-.414l1.435-.956V2.896c0-.414-.217-.635-.5-.917C3.488 1.674 3.146 1.18 3.146.5a.5.5 0 0 1 .5-.5z" />
                </svg>
                PINNED
              </span>
            ) : (
              <span className="text-[10px] font-pixel text-muted/60 tracking-wider">
                MEMO
              </span>
            )}

            <time dateTime={note.updatedAt} className="text-[11px] text-muted font-mono">
              {formattedDate}
            </time>
          </div>

          {/* Quick Pin Toggle Button */}
          {onTogglePin && (
            <button
              type="button"
              onClick={handlePinClick}
              aria-label={note.isPinned ? 'Lepas sematan' : 'Sematkan catatan'}
              title={note.isPinned ? 'Lepas sematan' : 'Sematkan catatan'}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                note.isPinned
                  ? 'bg-amber/20 text-amber border-amber/40 hover:bg-amber/30'
                  : 'bg-surface text-muted/60 border-line hover:text-amber hover:border-amber/30'
              }`}
            >
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
                <path d="M4.146.146A.5.5 0 0 1 4.5 0h7a.5.5 0 0 1 .5.5c0 .68-.342 1.174-.646 1.479-.283.282-.5.503-.5.917v1.894l1.435.956a.5.5 0 0 1 .211.414v1.5a.5.5 0 0 1-.5.5h-4v7.5a.5.5 0 0 1-1 0V8.26h-4a.5.5 0 0 1-.5-.5v-1.5a.5.5 0 0 1 .211-.414l1.435-.956V2.896c0-.414-.217-.635-.5-.917C3.488 1.674 3.146 1.18 3.146.5a.5.5 0 0 1 .5-.5z" />
              </svg>
            </button>
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────────
            TITLE & BODY SNIPPET
           ───────────────────────────────────────────────────────────── */}
        {hasTitle && (
          <h3 className="font-serif font-bold text-base sm:text-lg text-text tracking-tight mb-2 group-hover:text-primary-bright transition-colors line-clamp-2">
            <Link href={`/notes/${note.id}`} className="hover:underline focus:outline-hidden">
              {note.title}
            </Link>
          </h3>
        )}

        <div className="font-sans text-xs sm:text-sm text-text-subtle leading-relaxed whitespace-pre-line line-clamp-5 mb-4">
          <Link href={`/notes/${note.id}`} className="focus:outline-hidden block">
            {note.content}
          </Link>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            TAGS CHIPS
           ───────────────────────────────────────────────────────────── */}
        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mb-4" data-testid="note-tags">
            {note.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono text-muted bg-surface border border-line/60"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          FOOTER ACTIONS
         ───────────────────────────────────────────────────────────── */}
      <div className="pt-3 border-t border-line/50 flex items-center justify-between gap-2 text-xs">
        <Link
          href={`/notes/${note.id}`}
          className="text-xs font-medium text-primary-bright hover:text-lavender transition-colors inline-flex items-center gap-1"
        >
          <span>Buka Catatan</span>
          <svg viewBox="0 0 16 16" className="w-3 h-3 fill-current transition-transform group-hover:translate-x-0.5" aria-hidden="true">
            <path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06z" />
          </svg>
        </Link>

        {onDelete && (
          <ConfirmInline
            isConfirming={isDeleting}
            onInitiate={() => setIsDeleting(true)}
            onConfirm={handleConfirmDelete}
            onCancel={() => setIsDeleting(false)}
            promptText="Hapus catatan?"
            confirmText={isPending ? '...' : 'Hapus'}
            cancelText="Batal"
            triggerText="Hapus"
            className="text-[11px] py-0.5 px-2"
          />
        )}
      </div>
    </article>
  );
}
