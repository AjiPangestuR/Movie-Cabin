'use client';

import React, { useState, useTransition, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  type JournalEntry,
  type JournalMood,
  type Movie,
} from '@/types';
import { MoodSelector } from './MoodSelector';
import { MovieAttachmentDrawer } from './MovieAttachmentDrawer';
import { useToast } from '@/components/Toast';
import {
  createJournalAction,
  updateJournalAction,
  attachMovieAction,
  removeMovieAction,
} from '@/app/actions/journalActions';

interface JournalEditorViewProps {
  mode: 'create' | 'edit';
  initialJournal?: JournalEntry;
  availableMovies?: Movie[];
}

function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function JournalEditorView({
  mode,
  initialJournal,
  availableMovies = [],
}: JournalEditorViewProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Form State
  const [title, setTitle] = useState(initialJournal?.title || '');
  const [content, setContent] = useState(initialJournal?.content || '');
  const [entryDate, setEntryDate] = useState(
    initialJournal?.entryDate || getTodayDateString()
  );
  const [mood, setMood] = useState<JournalMood | null>(
    initialJournal?.mood || null
  );
  const [tags, setTags] = useState<string[]>(initialJournal?.tags || []);
  const [tagInput, setTagInput] = useState('');

  // Movie Attachment State
  const initialRelation =
    initialJournal?.relatedMovies && initialJournal.relatedMovies.length > 0
      ? initialJournal.relatedMovies[0]
      : null;

  const [selectedMovieId, setSelectedMovieId] = useState<string | null>(
    initialRelation?.movieId || null
  );
  const [resonanceNote, setResonanceNote] = useState<string>(
    initialRelation?.resonanceNote || ''
  );
  const [isMovieDrawerOpen, setIsMovieDrawerOpen] = useState(
    Boolean(initialRelation)
  );

  // Metadata Panel Collapsible State
  const [isMetaDrawerOpen, setIsMetaDrawerOpen] = useState(true);

  // Word count & read time
  const { words, minutes } = useMemo(() => {
    const w = content.trim() ? content.trim().split(/\s+/).length : 0;
    const m = Math.max(1, Math.ceil(w / 180));
    return { words: w, minutes: m };
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
  const handleSave = (isDraft: boolean) => {
    if (!title.trim()) {
      showToast('Judul jurnal wajib diisi.', true);
      return;
    }

    if (!isDraft && !content.trim()) {
      showToast('Konten jurnal wajib diisi untuk publikasi.', true);
      return;
    }

    startTransition(async () => {
      try {
        let entryId: string | null = null;

        if (mode === 'create') {
          const res = await createJournalAction({
            title: title.trim(),
            content: content.trim(),
            entryDate,
            mood,
            tags,
            isDraft,
          });

          if (!res.success || !res.data) {
            showToast(res.error || 'Gagal menyimpan jurnal.', true);
            return;
          }

          entryId = res.data.id;

          // Menautkan film jika dipilih
          if (selectedMovieId && entryId) {
            await attachMovieAction(
              entryId,
              selectedMovieId,
              resonanceNote.trim() || null
            );
          }

          showToast(
            isDraft
              ? 'Draft jurnal berhasil disimpan.'
              : 'Jurnal berhasil dipublikasikan ke rak rekaman.'
          );
          router.push(isDraft ? '/journal' : `/journal/${entryId}`);
        } else {
          // Edit Mode
          if (!initialJournal) return;
          entryId = initialJournal.id;

          const res = await updateJournalAction(entryId, {
            title: title.trim(),
            content: content.trim(),
            entryDate,
            mood,
            tags,
            isDraft,
          });

          if (!res.success || !res.data) {
            showToast(res.error || 'Gagal memperbarui jurnal.', true);
            return;
          }

          // Sinkronisasi movie attachment
          if (selectedMovieId !== initialRelation?.movieId) {
            // Hapus relation lama jika ada
            if (initialRelation?.movieId) {
              await removeMovieAction(entryId, initialRelation.movieId);
            }
            // Tambah relation baru jika ada
            if (selectedMovieId) {
              await attachMovieAction(
                entryId,
                selectedMovieId,
                resonanceNote.trim() || null
              );
            }
          } else if (
            selectedMovieId &&
            initialRelation &&
            resonanceNote !== (initialRelation.resonanceNote || '')
          ) {
            // Jika film sama tetapi catatan resonansi berubah, perbarui dengan attach/replace
            await attachMovieAction(
              entryId,
              selectedMovieId,
              resonanceNote.trim() || null
            );
          }

          showToast(
            isDraft
              ? 'Draft jurnal berhasil diperbarui.'
              : 'Jurnal berhasil disimpan dan dipublikasikan.'
          );
          router.push(`/journal/${entryId}`);
        }
      } catch (err: unknown) {
        const errorMsg =
          err instanceof Error ? err.message : 'Terjadi kesalahan sistem.';
        showToast(errorMsg, true);
      }
    });
  };

  return (
    <div className="max-w-[820px] mx-auto space-y-8 pb-24" data-testid="journal-editor-view">
      {/* ─────────────────────────────────────────────────────────────
          TOP TOOLBAR & STATUS
         ───────────────────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between gap-4 border-b border-line/60 pb-4">
        <Link
          href={mode === 'edit' && initialJournal ? `/journal/${initialJournal.id}` : '/journal'}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-muted hover:text-text transition-colors"
        >
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
            <path d="M9.78 12.78a.75.75 0 0 1-1.06 0L4.47 8.53a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 1.06L6.06 8l3.72 3.72a.75.75 0 0 1 0 1.06z" />
          </svg>
          <span>{mode === 'edit' ? 'Kembali ke Entri' : 'Batal & Kembali ke Jurnal'}</span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-pixel text-muted/70 tracking-wider uppercase">
            {mode === 'create' ? 'TULIS BARU' : 'MODE EDIT'}
          </span>
          <span className="text-muted/40">•</span>
          <span className="text-xs text-muted font-mono">
            {words} kata • {minutes} mnt
          </span>
        </div>
      </nav>

      {/* ─────────────────────────────────────────────────────────────
          DISTRACTION-FREE WRITING CANVAS
         ───────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        {/* Title Input */}
        <div>
          <label htmlFor="journal-title" className="sr-only">
            Judul Jurnal
          </label>
          <input
            id="journal-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Judul Renungan / Fragmen Hari..."
            maxLength={200}
            autoFocus
            className="w-full bg-transparent font-serif font-bold text-2xl sm:text-4xl text-text placeholder:text-muted/40 focus:outline-hidden border-b border-transparent focus:border-line transition-colors pb-2"
          />
        </div>

        {/* Content Textarea */}
        <div className="relative">
          <label htmlFor="journal-content" className="sr-only">
            Isi Jurnal
          </label>
          <textarea
            id="journal-content"
            rows={14}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Tuliskan renungan batin, resonansi sinema, atau percakapan yang tertinggal di kepala..."
            className="w-full bg-transparent font-sans text-base sm:text-lg text-text-subtle placeholder:text-muted/40 leading-relaxed focus:outline-hidden resize-y min-h-[360px] p-0"
          />
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          COLLAPSIBLE METADATA DRAWER (DATE, MOOD, TAGS, MOVIE ATTACHMENT)
         ───────────────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-line bg-surface/40 overflow-hidden">
        <button
          type="button"
          onClick={() => setIsMetaDrawerOpen((prev) => !prev)}
          className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-surface-elevated/40 transition-colors cursor-pointer select-none border-b border-line/40"
        >
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-pixel text-primary-bright uppercase tracking-wider">
              KONTEKS & METADATA JURNAL
            </span>
            <span className="text-xs text-muted">
              ({entryDate} {mood ? `• ${mood}` : ''} {tags.length > 0 ? `• ${tags.length} tag` : ''})
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted">
            <span>{isMetaDrawerOpen ? 'Sembunyikan' : 'Buka Pengaturan'}</span>
            <svg
              viewBox="0 0 16 16"
              className={`w-3.5 h-3.5 fill-current transition-transform duration-200 ${
                isMetaDrawerOpen ? 'rotate-180' : ''
              }`}
              aria-hidden="true"
            >
              <path d="M4.427 7.427l3.396 3.396a.25.25 0 0 0 .354 0l3.396-3.396A.25.25 0 0 0 11.396 7H4.604a.25.25 0 0 0-.177.427z" />
            </svg>
          </div>
        </button>

        {isMetaDrawerOpen && (
          <div className="p-5 space-y-6">
            {/* 1. Date Picker */}
            <div>
              <label htmlFor="journal-entry-date" className="block text-xs font-medium text-muted mb-1.5">
                Tanggal Entri Jurnal
              </label>
              <input
                id="journal-entry-date"
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="px-3.5 py-2 rounded-xl border border-line bg-surface text-text text-xs sm:text-sm focus:outline-hidden focus:border-primary/60 transition-colors"
              />
            </div>

            {/* 2. Mood Selector Chips */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted">
                  Suasana Batin Saat Menulis (Mood)
                </span>
                {mood && (
                  <button
                    type="button"
                    onClick={() => setMood(null)}
                    className="text-[11px] text-muted hover:text-text cursor-pointer"
                  >
                    Reset Mood
                  </button>
                )}
              </div>
              <MoodSelector
                selectedMood={mood}
                onSelectMood={setMood}
                allowClear={true}
              />
            </div>

            {/* 3. Tags Manager */}
            <div>
              <label htmlFor="journal-tag-input" className="block text-xs font-medium text-muted mb-1.5">
                Hashtag / Label Topik (tekan Enter atau Koma)
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="journal-tag-input"
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder="misal: malam, hujan, kenangan, sinema"
                  className="flex-1 px-3.5 py-2 rounded-xl border border-line bg-surface text-text text-xs sm:text-sm placeholder:text-muted/50 focus:outline-hidden focus:border-primary/60 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => handleAddTag(tagInput)}
                  className="px-3 py-2 rounded-xl border border-line bg-surface text-xs font-medium text-text hover:bg-surface-elevated transition-colors cursor-pointer"
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

            {/* 4. Movie Attachment Drawer */}
            <div>
              <MovieAttachmentDrawer
                availableMovies={availableMovies}
                selectedMovieId={selectedMovieId}
                resonanceNote={resonanceNote}
                onSelectMovie={setSelectedMovieId}
                onChangeResonanceNote={setResonanceNote}
                isOpen={isMovieDrawerOpen}
                onToggle={() => setIsMovieDrawerOpen((prev) => !prev)}
              />
            </div>
          </div>
        )}
      </section>

      {/* ─────────────────────────────────────────────────────────────
          STICKY BOTTOM ACTION BAR
         ───────────────────────────────────────────────────────────── */}
      <div className="sticky bottom-4 z-20 p-4 rounded-2xl border border-line bg-surface-elevated/95 backdrop-blur-md shadow-2xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Editor Aktif</span>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleSave(true)}
            className="px-4 py-2.5 rounded-xl border border-line bg-surface text-xs sm:text-sm font-medium text-text hover:bg-surface-elevated hover:border-line-subtle transition-all duration-150 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isPending ? 'Menyimpan...' : 'Simpan Draf'}
          </button>

          <button
            type="button"
            disabled={isPending}
            onClick={() => handleSave(false)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-neon-magenta text-white text-xs sm:text-sm font-semibold shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/35 hover:opacity-95 transition-all duration-200 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isPending ? (
              <span>Memproses...</span>
            ) : (
              <>
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
                  <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
                </svg>
                <span>Publikasikan Jurnal</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
