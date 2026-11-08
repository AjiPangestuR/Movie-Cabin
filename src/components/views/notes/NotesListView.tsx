'use client';

import React, { useState, useMemo, useTransition } from 'react';
import Link from 'next/link';
import { type PersonalNote } from '@/types';
import { NoteCard } from './NoteCard';
import { EmptyState } from '@/components/EmptyState';
import { useToast } from '@/components/Toast';
import {
  createNoteAction,
  pinNoteAction,
  unpinNoteAction,
  deleteNoteAction,
} from '@/app/actions/notesActions';

interface NotesListViewProps {
  initialNotes?: PersonalNote[];
  totalCount?: number;
}

export function NotesListView({
  initialNotes = [],
  totalCount = 0,
}: NotesListViewProps) {
  const { showToast } = useToast();
  const [notes, setNotes] = useState<PersonalNote[]>(initialNotes);
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'pinned'>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Quick Scratchpad State
  const [quickContent, setQuickContent] = useState('');
  const [isPendingQuick, startQuickTransition] = useTransition();

  // Kumpulan seluruh tag unik
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    notes.forEach((n) => {
      (n.tags || []).forEach((t) => tags.add(t));
    });
    return Array.from(tags).slice(0, 15);
  }, [notes]);

  // Statistik ringkas
  const stats = useMemo(() => {
    const total = notes.length;
    const pinned = notes.filter((n) => n.isPinned).length;
    return { total: totalCount || total, pinned };
  }, [notes, totalCount]);

  // Handler toggle pin
  const handleTogglePin = async (id: string, currentPinned: boolean) => {
    // Optimistic local update
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isPinned: !currentPinned } : n))
    );

    const res = currentPinned
      ? await unpinNoteAction(id)
      : await pinNoteAction(id);

    if (res.success && res.data) {
      showToast(
        currentPinned
          ? 'Sematan catatan dilepas.'
          : 'Catatan disematkan ke atas memo board.'
      );
      // Sinkronkan data resmi dari server
      setNotes((prev) =>
        prev.map((n) => (n.id === id ? res.data! : n))
      );
    } else {
      // Rollback on failure
      setNotes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isPinned: currentPinned } : n))
      );
      showToast(res.error || 'Gagal mengubah status sematan.', true);
    }
  };

  // Handler delete note
  const handleDeleteNote = async (id: string) => {
    const prevNotes = [...notes];
    setNotes((prev) => prev.filter((n) => n.id !== id));

    const res = await deleteNoteAction(id);
    if (res.success) {
      showToast('Catatan berhasil dihapus.');
    } else {
      setNotes(prevNotes);
      showToast(res.error || 'Gagal menghapus catatan.', true);
    }
  };

  // Handler quick note save
  const handleQuickSave = () => {
    const clean = quickContent.trim();
    if (!clean) {
      showToast('Tuliskan isi catatan terlebih dahulu.', true);
      return;
    }

    startQuickTransition(async () => {
      const res = await createNoteAction({
        content: clean,
      });

      if (res.success && res.data) {
        showToast('Ide cepat berhasil disimpan ke memo board.');
        setNotes((prev) => [res.data!, ...prev]);
        setQuickContent('');
      } else {
        showToast(res.error || 'Gagal menyimpan catatan cepat.', true);
      }
    });
  };

  // Filter logika
  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase();

    const filtered = notes.filter((note) => {
      // Filter search (title, content, tags)
      if (q) {
        const titleMatch = note.title?.toLowerCase().includes(q);
        const contentMatch = note.content.toLowerCase().includes(q);
        const tagMatch = note.tags?.some((t) => t.toLowerCase().includes(q));
        if (!titleMatch && !contentMatch && !tagMatch) return false;
      }

      // Filter tab pinned
      if (filterTab === 'pinned' && !note.isPinned) {
        return false;
      }

      // Filter tag
      if (selectedTag && !note.tags?.includes(selectedTag)) {
        return false;
      }

      return true;
    });

    // Pinned notes always sorted to the top, then updatedAt descending
    return filtered.sort((a, b) => {
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [notes, search, filterTab, selectedTag]);

  const isFiltered = Boolean(search) || filterTab !== 'all' || selectedTag !== null;

  const handleResetFilters = () => {
    setSearch('');
    setFilterTab('all');
    setSelectedTag(null);
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-16" data-testid="notes-list-view">
      {/* ─────────────────────────────────────────────────────────────
          EDITORIAL HEADER (Retro VHS Scratchpad Memo Board)
         ───────────────────────────────────────────────────────────── */}
      <section className="border-b border-line/60 pb-5 sm:pb-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 sm:gap-6">
          <div>
            {/* OSD Status Bar */}
            <div className="flex items-center gap-2 mb-2.5 sm:mb-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-pixel tracking-wider uppercase bg-primary/15 text-primary-bright border border-primary/30">
                PAPAN IDE
              </span>
              <span className="text-[10px] font-pixel text-muted tracking-wider uppercase">
                PERSONAL SCRATCHPAD
              </span>
              <span className="text-[10px] font-pixel text-muted/60 tracking-wider ml-auto hidden sm:inline" aria-hidden="true">
                RAW DRAFTS // VOL. MEMO
              </span>
            </div>

            <h1 className="font-serif font-bold text-2xl sm:text-4xl text-text tracking-tight">
              Personal Notes
            </h1>
            <p className="text-muted text-xs sm:text-base mt-1.5 sm:mt-2 max-w-xl leading-relaxed">
              Ruang tangkap cepat untuk pikiran, kutipan, potongan dialog, dan fragmen ide kreatif Beruang Sastra yang belum terstruktur.
            </p>
          </div>

          {/* Quick Action Button */}
          <div className="flex items-center gap-3 self-start lg:self-auto">
            <Link
              href="/notes/new"
              className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-primary to-neon-magenta text-white text-xs sm:text-sm font-semibold shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/35 hover:opacity-95 transition-all duration-200 active:scale-95 cursor-pointer"
            >
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
                <path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2z" />
              </svg>
              <span>+ Catatan Baru</span>
            </Link>
          </div>
        </div>

        {/* Quick Stats Strip */}
        <div className="mt-5 sm:mt-6 flex flex-wrap items-center gap-2 sm:gap-3 text-xs bg-surface/60 p-2 sm:p-2.5 rounded-xl border border-line shadow-xs">
          <div className="px-2.5 sm:px-3 py-1 rounded-lg bg-surface-elevated/70">
            <span className="text-muted">Total: </span>
            <span className="font-bold text-text font-mono">{stats.total}</span>
          </div>
          {stats.pinned > 0 && (
            <div className="px-2.5 sm:px-3 py-1 rounded-lg bg-surface-elevated/70">
              <span className="text-muted">Disematkan: </span>
              <span className="font-bold text-amber font-mono">{stats.pinned}</span>
            </div>
          )}
          {isFiltered && (
            <div className="ml-auto">
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-neon-magenta hover:underline cursor-pointer font-medium"
              >
                Reset Semua Filter
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          INLINE QUICK SCRATCHPAD (CAPTURE IDE KILAT)
         ───────────────────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-line bg-surface/50 p-3.5 sm:p-5 shadow-xs">
        <label htmlFor="quick-note-input" className="block text-xs font-medium text-muted mb-2">
          ⚡ Tangkap Ide Kilat
        </label>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            id="quick-note-input"
            data-testid="quick-note-input"
            type="text"
            value={quickContent}
            onChange={(e) => setQuickContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleQuickSave();
              }
            }}
            placeholder="Tulis ide atau kutipan singkat di sini... (tekan Enter)"
            maxLength={10000}
            className="flex-1 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-line bg-surface text-text text-xs sm:text-sm placeholder:text-muted/60 focus:outline-hidden focus:border-primary/60 transition-colors"
          />
          <button
            type="button"
            disabled={isPendingQuick || !quickContent.trim()}
            onClick={handleQuickSave}
            className="px-4 py-2 sm:py-2.5 rounded-xl border border-line bg-surface-elevated text-xs sm:text-sm font-semibold text-text hover:border-primary/50 hover:text-primary-bright transition-all disabled:opacity-40 cursor-pointer flex-none text-center"
          >
            {isPendingQuick ? 'Menyimpan...' : '+ Simpan Cepat'}
          </button>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          COMPACT FILTER BAR (SEARCH, TABS, TAGS)
         ───────────────────────────────────────────────────────────── */}
      <section className="space-y-3.5 bg-surface/40 p-3.5 sm:p-5 rounded-2xl border border-line">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <svg
              viewBox="0 0 16 16"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 fill-muted pointer-events-none"
              aria-hidden="true"
            >
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari dalam catatan atau tag..."
              aria-label="Cari catatan"
              className="w-full pl-10 pr-9 py-2 sm:py-2.5 rounded-xl border border-line bg-surface text-text text-xs sm:text-sm placeholder:text-muted/60 focus:outline-hidden focus:border-primary/60 transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-muted hover:text-text rounded-md"
                title="Hapus kata kunci"
                aria-label="Hapus kata kunci pencarian"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter Tabs: Semua vs Disematkan */}
          <div className="flex items-center gap-1 p-0.5 sm:p-1 rounded-xl bg-surface border border-line self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer select-none ${
                filterTab === 'all'
                  ? 'bg-surface-elevated text-text font-semibold shadow-xs'
                  : 'text-muted hover:text-text'
              }`}
            >
              Semua ({notes.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('pinned')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 select-none ${
                filterTab === 'pinned'
                  ? 'bg-amber/20 text-amber font-semibold shadow-xs border border-amber/30'
                  : 'text-muted hover:text-amber'
              }`}
            >
              <svg viewBox="0 0 16 16" className="w-3 h-3 fill-current flex-none" aria-hidden="true">
                <path d="M4.146.146A.5.5 0 0 1 4.5 0h7a.5.5 0 0 1 .5.5c0 .68-.342 1.174-.646 1.479-.283.282-.5.503-.5.917v1.894l1.435.956a.5.5 0 0 1 .211.414v1.5a.5.5 0 0 1-.5.5h-4v7.5a.5.5 0 0 1-1 0V8.26h-4a.5.5 0 0 1-.5-.5v-1.5a.5.5 0 0 1 .211-.414l1.435-.956V2.896c0-.414-.217-.635-.5-.917C3.488 1.674 3.146 1.18 3.146.5a.5.5 0 0 1 .5-.5z" />
              </svg>
              <span>Disematkan ({stats.pinned})</span>
            </button>
          </div>
        </div>

        {/* Tag Filter Chips: Horizontal scrolling strip on mobile */}
        {allTags.length > 0 && (
          <div className="pt-1.5 border-t border-line/40">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-pixel text-muted/70 uppercase">
                HASHTAG ({allTags.length})
              </span>
              {selectedTag && (
                <button
                  type="button"
                  onClick={() => setSelectedTag(null)}
                  className="text-[10px] text-neon-magenta hover:underline cursor-pointer"
                >
                  Reset Tag
                </button>
              )}
            </div>
            <div className="-mx-3.5 px-3.5 sm:mx-0 sm:px-0 flex items-center gap-1.5 overflow-x-auto sm:flex-wrap [scrollbar-width:none] [-webkit-overflow-scrolling:touch] py-0.5">
              {allTags.map((tag) => {
                const isSelected = selectedTag === tag;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedTag(isSelected ? null : tag)}
                    className={`flex-none px-2.5 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'bg-primary/20 text-primary-bright border border-primary/40 font-semibold'
                        : 'bg-surface text-muted border border-line/60 hover:text-text hover:border-line'
                    }`}
                  >
                    #{tag}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Filter Feedback */}
        {isFiltered && (
          <div className="flex items-center justify-between text-xs text-muted pt-2 border-t border-line/30">
            <span>
              Menampilkan <strong className="text-text font-bold">{filteredNotes.length}</strong> dari {notes.length} catatan
            </span>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-neon-magenta hover:underline cursor-pointer font-medium"
            >
              Reset semua filter
            </button>
          </div>
        )}
      </section>

      {/* ─────────────────────────────────────────────────────────────
          NOTES CARD GRID
         ───────────────────────────────────────────────────────────── */}
      {filteredNotes.length === 0 ? (
        <EmptyState
          title={isFiltered ? 'Tidak ada catatan yang cocok' : 'Belum ada catatan pribadi'}
          description={
            isFiltered
              ? 'Coba atur ulang kata kunci pencarian atau tag untuk melihat catatan lainnya.'
              : 'Papan ide ini masih hening. Tangkap ide pertama, kutipan dialog film, atau potongan inspirasi yang melintas.'
          }
          actionText={isFiltered ? 'Reset Filter' : '+ Buat Catatan Pertama'}
          actionHref={isFiltered ? undefined : '/notes/new'}
          onAction={isFiltered ? handleResetFilters : undefined}
          primaryAction={!isFiltered}
        />
      ) : (
        <div
          data-testid="notes-grid"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5"
        >
          {filteredNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onTogglePin={handleTogglePin}
              onDelete={handleDeleteNote}
            />
          ))}
        </div>
      )}
    </div>
  );
}
