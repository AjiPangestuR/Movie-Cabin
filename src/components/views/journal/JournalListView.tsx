'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { type JournalEntry, type JournalMood } from '@/types';
import { MoodSelector } from './MoodSelector';
import { JournalCard } from './JournalCard';
import { EmptyState } from '@/components/EmptyState';
import { FilmStripDivider } from '@/components/FilmStripDivider';

interface JournalListViewProps {
  initialEntries?: JournalEntry[];
  totalCount?: number;
  mode?: 'stream' | 'archive';
}

type StatusFilterType = 'all' | 'published' | 'draft';

function getMonthYearLabel(dateStr: string): string {
  if (!dateStr) return 'Lainnya';
  const [year, month] = dateStr.split('-').map(Number);
  if (!year || !month) return 'Lainnya';

  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function JournalListView({
  initialEntries = [],
  totalCount = 0,
  mode = 'stream',
}: JournalListViewProps) {
  const isArchiveMode = mode === 'archive';
  const [entries] = useState<JournalEntry[]>(initialEntries);
  const [search, setSearch] = useState('');
  const [selectedMood, setSelectedMood] = useState<JournalMood | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('all');
  const [dateFilter, setDateFilter] = useState('');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Daftar tahun unik dari entri yang ada untuk archive year jumper
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    entries.forEach((e) => {
      if (e.entryDate && e.entryDate.length >= 4) {
        years.add(e.entryDate.slice(0, 4));
      }
    });
    return Array.from(years).sort().reverse();
  }, [entries]);

  // Kumpulan seluruh tag unik
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    entries.forEach((e) => {
      (e.tags || []).forEach((t) => tags.add(t));
    });
    return Array.from(tags).slice(0, 12);
  }, [entries]);

  // Statistik ringkas entri
  const stats = useMemo(() => {
    const total = entries.length;
    const published = entries.filter((e) => !e.isDraft).length;
    const drafts = total - published;
    return { total: totalCount || total, published, drafts };
  }, [entries, totalCount]);

  // Filter logika
  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();

    return entries.filter((entry) => {
      // Search matching title, content, or tags
      if (q) {
        const titleMatch = entry.title.toLowerCase().includes(q);
        const contentMatch = entry.content.toLowerCase().includes(q);
        const tagMatch = entry.tags?.some((t) => t.toLowerCase().includes(q));
        if (!titleMatch && !contentMatch && !tagMatch) return false;
      }

      // Mood match
      if (selectedMood && entry.mood !== selectedMood) {
        return false;
      }

      // Status match (Draft vs Published)
      if (statusFilter === 'published' && entry.isDraft) return false;
      if (statusFilter === 'draft' && !entry.isDraft) return false;

      // Specific Date match
      if (dateFilter && entry.entryDate !== dateFilter) {
        return false;
      }

      // Year match (Archive Mode)
      if (yearFilter !== 'all' && !entry.entryDate.startsWith(yearFilter)) {
        return false;
      }

      // Tag filter
      if (selectedTag && !entry.tags?.includes(selectedTag)) {
        return false;
      }

      return true;
    });
  }, [entries, search, selectedMood, statusFilter, dateFilter, yearFilter, selectedTag]);

  // Mengelompokkan berdasarkan Bulan/Tahun untuk Archive Mode
  const groupedArchiveEntries = useMemo(() => {
    if (!isArchiveMode) return [];

    const groups: { label: string; items: JournalEntry[] }[] = [];
    const map = new Map<string, JournalEntry[]>();

    filteredEntries.forEach((entry) => {
      const label = getMonthYearLabel(entry.entryDate);
      if (!map.has(label)) {
        map.set(label, []);
      }
      map.get(label)!.push(entry);
    });

    map.forEach((items, label) => {
      groups.push({ label, items });
    });

    return groups;
  }, [filteredEntries, isArchiveMode]);

  const isFiltered =
    Boolean(search) ||
    selectedMood !== null ||
    statusFilter !== 'all' ||
    Boolean(dateFilter) ||
    yearFilter !== 'all' ||
    selectedTag !== null;

  const handleResetFilters = () => {
    setSearch('');
    setSelectedMood(null);
    setStatusFilter('all');
    setDateFilter('');
    setYearFilter('all');
    setSelectedTag(null);
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-12" data-testid="journal-list-view">
      {/* ─────────────────────────────────────────────────────────────
          EDITORIAL HEADER (Retro VHS Sanctuary Desk)
         ───────────────────────────────────────────────────────────── */}
      <section className="border-b border-line/60 pb-5 sm:pb-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 sm:gap-6">
          <div>
            {/* OSD Status Bar */}
            <div className="flex items-center gap-2 mb-2.5 sm:mb-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-pixel tracking-wider uppercase bg-primary/15 text-primary-bright border border-primary/30">
                {mode === 'stream' ? 'DIARI PRIBADI' : 'CHRONICLE VAULT'}
              </span>
              <span className="text-[10px] font-pixel text-muted tracking-wider uppercase">
                {mode === 'stream' ? 'MOCAB JOURNAL LOG' : 'JURNAL ARSIP'}
              </span>
              <span className="text-[10px] font-pixel text-muted/60 tracking-wider ml-auto hidden sm:inline" aria-hidden="true">
                SP 120 MIN // INTROSPECTIVE
              </span>
            </div>

            <h1 className="font-serif font-bold text-2xl sm:text-4xl text-text tracking-tight">
              {mode === 'stream' ? 'My Journal' : 'Jurnal Arsip'}
            </h1>
            <p className="text-muted text-xs sm:text-base mt-1.5 sm:mt-2 max-w-xl leading-relaxed">
              {mode === 'stream'
                ? 'Ruang aman dan hening untuk merangkai fragmen hari, renungan batin, dan resonansi personal dengan film-film yang telah disimak.'
                : 'Eksplorasi kronologis jejak batin dan renungan sinematik yang tersimpan rapi dalam pita memori Beruang Sastra.'}
            </p>
          </div>

          {/* Quick Actions & Navigation Switcher */}
          <div className="flex items-center gap-2.5 sm:gap-3 self-start lg:self-auto flex-wrap">
            <Link
              href={mode === 'stream' ? '/journal/archive' : '/journal'}
              className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-line bg-surface text-xs sm:text-sm font-medium text-text-subtle hover:text-text hover:border-line-subtle transition-all duration-150"
            >
              {mode === 'stream' ? 'Arsip Kronologis →' : '← Aliran Jurnal'}
            </Link>

            <Link
              href="/journal/new"
              className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-primary to-neon-magenta text-white text-xs sm:text-sm font-semibold shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/35 hover:opacity-95 transition-all duration-200 active:scale-95 cursor-pointer"
            >
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
                <path d="M8 2a.75.75 0 0 1 .75.75v4.5h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5h-4.5a.75.75 0 0 1 0-1.5h4.5v-4.5A.75.75 0 0 1 8 2z" />
              </svg>
              <span>Tulis Jurnal Baru</span>
            </Link>
          </div>
        </div>

        {/* Quick Stats Strip */}
        <div className="mt-5 sm:mt-6 flex flex-wrap items-center gap-2 sm:gap-3 text-xs bg-surface/60 p-2 sm:p-2.5 rounded-xl border border-line shadow-xs">
          <div className="px-2.5 sm:px-3 py-1 rounded-lg bg-surface-elevated/70">
            <span className="text-muted">Total: </span>
            <span className="font-bold text-text font-mono">{stats.total}</span>
          </div>
          <div className="px-2.5 sm:px-3 py-1 rounded-lg bg-surface-elevated/70">
            <span className="text-muted">Terbit: </span>
            <span className="font-bold text-primary-bright font-mono">{stats.published}</span>
          </div>
          {stats.drafts > 0 && (
            <div className="px-2.5 sm:px-3 py-1 rounded-lg bg-surface-elevated/70">
              <span className="text-muted">Draft: </span>
              <span className="font-bold text-amber font-mono">{stats.drafts}</span>
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
          COMPACT RESPONSIVE FILTER BAR
          Optimized density: prevents mobile vertical bloat & horizontal page overflow
         ───────────────────────────────────────────────────────────── */}
      <section className="space-y-3.5 bg-surface/40 p-3.5 sm:p-5 rounded-2xl border border-line">
        {/* Search Input */}
        <div className="relative">
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
            placeholder="Cari dalam judul, renungan, atau hashtag..."
            aria-label="Cari jurnal"
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

        {/* Secondary Row: Status / Date / Year Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          {/* Status Filter (Stream Mode) */}
          {mode === 'stream' ? (
            <div className="flex items-center gap-1 p-0.5 sm:p-1 rounded-xl bg-surface border border-line">
              {(['all', 'published', 'draft'] as StatusFilterType[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer select-none ${
                    statusFilter === st
                      ? 'bg-surface-elevated text-text font-semibold shadow-xs'
                      : 'text-muted hover:text-text'
                  }`}
                >
                  {st === 'all' ? 'Semua' : st === 'published' ? 'Terbit' : 'Draft'}
                </button>
              ))}
            </div>
          ) : (
            /* Year Filter (Archive Mode) */
            <div className="flex items-center gap-2">
              <label htmlFor="year-select" className="text-xs text-muted font-pixel uppercase">
                TAHUN:
              </label>
              <select
                id="year-select"
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                aria-label="Filter tahun arsip"
                className="px-3 py-1 rounded-xl border border-line bg-surface text-text text-xs focus:outline-hidden focus:border-primary/60 transition-colors cursor-pointer"
              >
                <option value="all">Semua Tahun</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date Filter (Stream Mode) */}
          {mode === 'stream' && (
            <div className="flex items-center gap-1.5 ml-auto">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                aria-label="Filter tanggal jurnal"
                className="px-2.5 py-1 rounded-xl border border-line bg-surface text-text text-xs focus:outline-hidden focus:border-primary/60 transition-colors"
              />
              {dateFilter && (
                <button
                  type="button"
                  onClick={() => setDateFilter('')}
                  className="px-1.5 py-1 rounded-lg text-xs text-muted hover:text-text"
                  title="Hapus filter tanggal"
                >
                  ✕
                </button>
              )}
            </div>
          )}
        </div>

        {/* Mood Selector: Horizontal scrolling strip on mobile, flex-wrap on desktop */}
        <div className="pt-1.5 border-t border-line/40">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-pixel text-muted/70 tracking-wider uppercase">
              SUASANA BATIN (MOOD FILTER)
            </span>
            {selectedMood && (
              <button
                type="button"
                onClick={() => setSelectedMood(null)}
                className="text-[11px] text-neon-magenta hover:underline cursor-pointer"
              >
                Reset Mood
              </button>
            )}
          </div>
          <div className="-mx-3.5 px-3.5 sm:mx-0 sm:px-0 overflow-x-auto [scrollbar-width:none] [-webkit-overflow-scrolling:touch] py-0.5">
            <MoodSelector
              selectedMood={selectedMood}
              onSelectMood={setSelectedMood}
              allowClear={true}
              className="flex-nowrap sm:flex-wrap"
            />
          </div>
        </div>

        {/* Tag Filters (If Any Tags Exist) */}
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
              Menampilkan <strong className="text-text font-bold">{filteredEntries.length}</strong> dari {entries.length} entri
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
          JOURNAL ENTRIES STREAM / ARCHIVE
         ───────────────────────────────────────────────────────────── */}
      {filteredEntries.length === 0 ? (
        <EmptyState
          title={isFiltered ? 'Tidak ada jurnal yang cocok' : 'Belum ada catatan jurnal'}
          description={
            isFiltered
              ? 'Coba atur ulang kata kunci, mood, atau rentang tanggal untuk menemukan catatan lain.'
              : 'Mulai rekaman batin pertamamu. Tuangkan renungan hari ini atau tautkan resonansinya dengan film yang kamu sukai.'
          }
          actionText={isFiltered ? 'Reset Filter' : '+ Tulis Jurnal Pertama'}
          actionHref={isFiltered ? undefined : '/journal/new'}
          onAction={isFiltered ? handleResetFilters : undefined}
          primaryAction={!isFiltered}
        />
      ) : mode === 'stream' ? (
        /* Stream Mode: Chronological List */
        <div className="space-y-4 sm:space-y-5" data-testid="journal-stream-list">
          {filteredEntries.map((entry) => (
            <JournalCard key={entry.id} entry={entry} />
          ))}
        </div>
      ) : (
        /* Archive Mode: Chronological Vault Grouped by Month/Year */
        <div className="space-y-8" data-testid="journal-archive-groups">
          {groupedArchiveEntries.map((group) => (
            <section key={group.label} className="space-y-4">
              <FilmStripDivider label={group.label} />
              <div className="space-y-4 sm:space-y-5">
                {group.items.map((entry) => (
                  <JournalCard key={entry.id} entry={entry} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
