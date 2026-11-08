'use client';

import React, { useState, useTransition, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type PersonalNote } from '@/types';
import { ConfirmInline } from '@/components/ConfirmInline';
import { useToast } from '@/components/Toast';
import {
  createNoteAction,
  updateNoteAction,
  deleteNoteAction,
} from '@/app/actions/notesActions';

interface NoteEditorViewProps {
  mode: 'create' | 'edit';
  initialNote?: PersonalNote;
}

function formatNoteDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function NoteEditorView({
  mode,
  initialNote,
}: NoteEditorViewProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Form State
  const [title, setTitle] = useState(initialNote?.title || '');
  const [content, setContent] = useState(initialNote?.content || '');
  const [tags, setTags] = useState<string[]>(initialNote?.tags || []);
  const [isPinned, setIsPinned] = useState<boolean>(initialNote?.isPinned || false);
  const [tagInput, setTagInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Word count & char stats
  const wordCount = useMemo(() => {
    return content.trim() ? content.trim().split(/\s+/).length : 0;
  }, [content]);

  // Tag Handlers
  const handleAddTag = (rawTag: string) => {
    const clean = rawTag.trim().toLowerCase().replace(/^#+/, '').replace(/[^a-z0-9_-]/g, '');
    if (!clean) return;
    if (!tags.includes(clean)) {
      setTags((prev) => [...prev, clean]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag(tagInput);
    }
  };

  // Submit Handler
  const handleSave = () => {
    const cleanContent = content.trim();
    if (!cleanContent) {
      showToast('Konten catatan wajib diisi.', true);
      return;
    }

    if (content.length > 10000) {
      showToast('Konten catatan maksimal 10.000 karakter.', true);
      return;
    }

    startTransition(async () => {
      try {
        if (mode === 'create') {
          const res = await createNoteAction({
            title: title.trim(),
            content: cleanContent,
            tags,
            isPinned,
          });

          if (!res.success || !res.data) {
            showToast(res.error || 'Gagal menyimpan catatan.', true);
            return;
          }

          showToast('Catatan berhasil ditambahkan ke papan ide.');
          router.push('/notes');
        } else {
          // Edit Mode
          if (!initialNote) return;

          const res = await updateNoteAction(initialNote.id, {
            title: title.trim(),
            content: cleanContent,
            tags,
            isPinned,
          });

          if (!res.success || !res.data) {
            showToast(res.error || 'Gagal memperbarui catatan.', true);
            return;
          }

          showToast('Catatan berhasil diperbarui.');
          router.push('/notes');
        }
      } catch (err: unknown) {
        const errorMsg =
          err instanceof Error ? err.message : 'Terjadi kesalahan sistem.';
        showToast(errorMsg, true);
      }
    });
  };

  // Delete Handler
  const handleDelete = () => {
    if (!initialNote) return;

    startTransition(async () => {
      const res = await deleteNoteAction(initialNote.id);
      if (res.success) {
        showToast('Catatan berhasil dihapus.');
        router.push('/notes');
      } else {
        showToast(res.error || 'Gagal menghapus catatan.', true);
        setIsDeleting(false);
      }
    });
  };

  return (
    <div
      data-testid="note-editor-view"
      className="max-w-[760px] mx-auto space-y-6 sm:space-y-8 pb-16"
    >
      {/* ─────────────────────────────────────────────────────────────
          TOP TOOLBAR & MOBILE ACTION DOCK (Keyboard-Safe)
          Mobile top action button allows 1-tap saving without scrolling
          and without keyboard collision.
         ───────────────────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between gap-3 border-b border-line/60 pb-3.5 sm:pb-4">
        <Link
          href="/notes"
          className="inline-flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-muted hover:text-text transition-colors"
        >
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
            <path d="M9.78 12.78a.75.75 0 0 1-1.06 0L4.47 8.53a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 1.06L6.06 8l3.72 3.72a.75.75 0 0 1 0 1.06z" />
          </svg>
          <span>Kembali ke Catatan</span>
        </Link>

        {/* Mobile Top Action Button */}
        <div className="flex sm:hidden items-center gap-2">
          <button
            type="button"
            disabled={isPending || !content.trim()}
            onClick={handleSave}
            className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-primary to-neon-magenta text-white text-xs font-semibold shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer"
            aria-label="Simpan Catatan"
            title="Simpan Catatan"
          >
            {isPending ? '...' : 'Simpan'}
          </button>
        </div>

        {/* Desktop Status Info */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-muted">
          <span className="text-[10px] font-pixel text-muted/70 tracking-wider uppercase">
            {mode === 'create' ? 'TULIS BARU' : 'EDIT CATATAN'}
          </span>
          {initialNote && (
            <>
              <span>•</span>
              <span className="font-mono text-[11px]">
                {formatNoteDate(initialNote.updatedAt)}
              </span>
            </>
          )}
        </div>
      </nav>

      {/* ─────────────────────────────────────────────────────────────
          CANVAS MENULIS CATATAN
         ───────────────────────────────────────────────────────────── */}
      <section className="space-y-4 sm:space-y-5">
        {/* Title Input (Opsional) */}
        <div>
          <label htmlFor="note-title" className="sr-only">
            Judul Catatan
          </label>
          <input
            id="note-title"
            data-testid="note-title-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Judul Catatan (opsional)..."
            maxLength={200}
            autoFocus={mode === 'create'}
            className="w-full bg-transparent font-serif font-bold text-xl sm:text-3xl text-text placeholder:text-muted/40 focus:outline-hidden border-b border-line/60 focus:border-primary/60 transition-colors pb-2"
          />
        </div>

        {/* Content Textarea (Wajib) */}
        <div>
          <label htmlFor="note-content" className="sr-only">
            Isi Catatan
          </label>
          <textarea
            id="note-content"
            data-testid="note-content-input"
            rows={9}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Tuliskan ide, kutipan, potongan dialog, atau inspirasi singkatmu..."
            maxLength={10000}
            className="w-full bg-transparent font-sans text-base sm:text-lg text-text-subtle placeholder:text-muted/40 leading-relaxed focus:outline-hidden resize-y min-h-[220px] sm:min-h-[280px] p-0"
          />
        </div>

        {/* Word count & Character counter indicator */}
        <div className="flex items-center justify-between text-xs text-muted/70 border-t border-line/40 pt-2 font-mono">
          <span>{wordCount} kata</span>
          <span>{content.length} / 10.000 karakter</span>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          PENGATURAN CATATAN (PIN & TAGS)
         ───────────────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-line bg-surface/40 p-4 sm:p-5 space-y-4">
        <div className="text-[10px] font-pixel text-primary-bright uppercase tracking-wider">
          PENGATURAN MEMO
        </div>

        {/* Pin Status Toggle */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <label
              htmlFor="note-pin-toggle"
              className="text-xs sm:text-sm font-medium text-text cursor-pointer block"
            >
              Sematkan ke Atas Papan (Pin)
            </label>
            <p className="text-[11px] text-muted">
              Catatan yang disematkan akan selalu tampil di urutan teratas memo board.
            </p>
          </div>

          <button
            id="note-pin-toggle"
            data-testid="note-pin-toggle"
            type="button"
            onClick={() => setIsPinned((prev) => !prev)}
            aria-pressed={isPinned}
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all duration-150 cursor-pointer flex items-center gap-1.5 flex-none active:scale-95 ${
              isPinned
                ? 'bg-amber/20 text-amber border-amber/40 font-semibold shadow-xs'
                : 'bg-surface text-muted border-line hover:text-text'
            }`}
          >
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
              <path d="M4.146.146A.5.5 0 0 1 4.5 0h7a.5.5 0 0 1 .5.5c0 .68-.342 1.174-.646 1.479-.283.282-.5.503-.5.917v1.894l1.435.956a.5.5 0 0 1 .211.414v1.5a.5.5 0 0 1-.5.5h-4v7.5a.5.5 0 0 1-1 0V8.26h-4a.5.5 0 0 1-.5-.5v-1.5a.5.5 0 0 1 .211-.414l1.435-.956V2.896c0-.414-.217-.635-.5-.917C3.488 1.674 3.146 1.18 3.146.5a.5.5 0 0 1 .5-.5z" />
            </svg>
            <span>{isPinned ? 'Disematkan' : 'Sematkan'}</span>
          </button>
        </div>

        {/* Tag Manager */}
        <div className="pt-3 border-t border-line/40">
          <label htmlFor="note-tag-input" className="block text-xs font-medium text-muted mb-1.5">
            Hashtag / Label Topik (tekan Enter atau Koma)
          </label>
          <div className="flex items-center gap-2">
            <input
              id="note-tag-input"
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="misal: ide, dialog, kutipan, riset"
              className="flex-1 px-3.5 py-2 rounded-xl border border-line bg-surface text-text text-xs sm:text-sm placeholder:text-muted/50 focus:outline-hidden focus:border-primary/60 transition-colors"
            />
            <button
              type="button"
              onClick={() => handleAddTag(tagInput)}
              className="px-3 py-2 rounded-xl border border-line bg-surface text-xs font-medium text-text hover:bg-surface-elevated transition-colors cursor-pointer flex-none"
            >
              Tambah Tag
            </button>
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-elevated border border-line text-xs font-mono text-text-subtle"
                >
                  <span>#{tag}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="text-muted hover:text-danger text-xs leading-none"
                    aria-label={`Hapus tag ${tag}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          BOTTOM ACTIONS BAR (Natural document flow — no keyboard collision)
         ───────────────────────────────────────────────────────────── */}
      <footer className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-line/60">
        <Link
          href="/notes"
          className="text-xs sm:text-sm text-muted hover:text-text transition-colors"
        >
          Batal
        </Link>

        <div className="flex items-center gap-3">
          {mode === 'edit' && (
            <ConfirmInline
              isConfirming={isDeleting}
              onInitiate={() => setIsDeleting(true)}
              onConfirm={handleDelete}
              onCancel={() => setIsDeleting(false)}
              promptText="Hapus catatan ini?"
              confirmText={isPending ? 'Menghapus...' : 'Ya, hapus'}
              cancelText="Batal"
              triggerText="Hapus Catatan"
            />
          )}

          <button
            type="button"
            disabled={isPending || !content.trim()}
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 rounded-xl bg-gradient-to-r from-primary to-neon-magenta text-white text-xs sm:text-sm font-semibold shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/35 hover:opacity-95 transition-all duration-200 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isPending ? (
              <span>Menyimpan...</span>
            ) : (
              <span>Simpan Catatan</span>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}
