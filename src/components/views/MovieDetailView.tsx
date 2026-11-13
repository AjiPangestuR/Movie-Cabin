'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Movie, type WatchSource, getAccessTypeLabel } from '@/types';
import { updateMovieMoods, deleteMovie } from '@/lib/movies';
import { deleteWatchSource, setPrimaryWatchSource } from '@/lib/watchSources';
import { PosterCover } from '@/components/PosterCover';
import { MoodChips } from '@/components/MoodChips';
import { Badge } from '@/components/Badge';
import { ConfirmInline } from '@/components/ConfirmInline';
import { FilmStripDivider } from '@/components/FilmStripDivider';
import { TmdbAttribution } from '@/components/TmdbAttribution';
import { useToast } from '@/components/Toast';
import { WatchSourceModal } from '@/components/WatchSourceModal';
import { DeleteWatchSourceDialog } from '@/components/DeleteWatchSourceDialog';

export interface RelatedJournalSummary {
  id: string;
  title: string;
  entryDate: string;
  resonanceNote?: string | null;
}

interface MovieDetailViewProps {
  initialMovie: Movie;
  initialMoods?: string[];
  posterUrl?: string | null;
  relatedJournals?: RelatedJournalSummary[];
  initialWatchSources?: WatchSource[];
}

export function MovieDetailView({
  initialMovie,
  initialMoods = [],
  posterUrl,
  relatedJournals = [],
  initialWatchSources = [],
}: MovieDetailViewProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [movie, setMovie] = useState<Movie>(initialMovie);
  const [availableMoods] = useState<string[]>(initialMoods);
  const [isDeleting, setIsDeleting] = useState(false);

  // Watch Sources State (Phase 16.2 Integration)
  const [watchSources, setWatchSources] = useState<WatchSource[]>(initialWatchSources);
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<WatchSource | null>(null);
  const [sourceToDelete, setSourceToDelete] = useState<WatchSource | null>(null);
  const [isDeletingSource, setIsDeletingSource] = useState(false);
  const [isSettingPrimaryId, setIsSettingPrimaryId] = useState<string | null>(null);

  const primarySource = watchSources.find((s) => s.isPrimary);
  const hasSafeWatchUrl = /^https?:\/\/\S+$/i.test(movie.watchUrl || '');

  const handleToggleMood = async (mood: string) => {
    const isExisting = movie.moods.includes(mood);
    if (isExisting && movie.moods.length === 1) {
      showToast('Minimal satu mood.', true);
      return;
    }

    const nextMoods = isExisting
      ? movie.moods.filter((m) => m !== mood)
      : [...movie.moods, mood];

    try {
      const updated = await updateMovieMoods(movie.id, nextMoods);
      setMovie(updated);
      showToast('Mood berhasil diperbarui.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui mood.';
      showToast(msg, true);
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      const title = movie.title;
      await deleteMovie(movie.id);
      showToast(`"${title}" dihapus dari Kabin.`);
      router.push('/bank');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus film.';
      showToast(msg, true);
    }
  };

  const handleSetPrimary = async (source: WatchSource) => {
    setIsSettingPrimaryId(source.id);
    try {
      const updated = await setPrimaryWatchSource(source.id);
      setWatchSources((prev) =>
        prev.map((s) => ({
          ...s,
          isPrimary: s.id === source.id,
        }))
      );
      // Sinkronisasi state movie.watchUrl dengan URL primary baru
      setMovie((prev) => ({
        ...prev,
        watchUrl: updated.sourceUrl || '',
      }));
      showToast(`"${source.platformName}" dijadikan sumber utama.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menetapkan sumber utama.';
      showToast(msg, true);
    } finally {
      setIsSettingPrimaryId(null);
    }
  };

  const handleDeleteSourceConfirm = async () => {
    if (!sourceToDelete) return;
    const wasPrimaryDeleted = sourceToDelete.isPrimary;
    setIsDeletingSource(true);
    try {
      const result = await deleteWatchSource(sourceToDelete.id);
      setWatchSources((prev) => {
        const filtered = prev.filter((s) => s.id !== sourceToDelete.id);
        if (result.newPrimaryId) {
          return filtered.map((s) =>
            s.id === result.newPrimaryId ? { ...s, isPrimary: true } : s
          );
        }
        return filtered;
      });

      // Sinkronisasi state movie.watchUrl di client berdasarkan hasil Server Action
      if (wasPrimaryDeleted) {
        setMovie((prev) => ({
          ...prev,
          watchUrl: result.newPrimaryUrl || '',
        }));
      }

      showToast('Sumber tontonan berhasil dihapus.');
      setSourceToDelete(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menghapus sumber tontonan.';
      showToast(msg, true);
    } finally {
      setIsDeletingSource(false);
    }
  };

  const handleModalSuccess = (savedSource: WatchSource, isEdit: boolean) => {
    setWatchSources((prev) => {
      let updatedList: WatchSource[];
      if (isEdit) {
        updatedList = prev.map((s) => (s.id === savedSource.id ? savedSource : s));
      } else {
        // If it was the first source or marked isPrimary, promote it
        updatedList = [savedSource, ...prev];
      }
      if (savedSource.isPrimary) {
        updatedList = updatedList.map((s) => ({
          ...s,
          isPrimary: s.id === savedSource.id,
        }));
      }
      return updatedList;
    });

    // Sinkronisasi state movie.watchUrl jika sumber yang disimpan adalah primary
    if (savedSource.isPrimary) {
      setMovie((prev) => ({
        ...prev,
        watchUrl: savedSource.sourceUrl || '',
      }));
    }

    showToast(
      isEdit
        ? `Sumber "${savedSource.platformName}" berhasil diperbarui.`
        : `Sumber "${savedSource.platformName}" berhasil ditambahkan.`
    );
  };

  /**
   * Helper render untuk Primary CTA tombol tonton film (Mobile & Desktop).
   * Menyesuaikan secara dinamis dengan primary source aktif, ketiadaan URL, atau legacy fallback.
   */
  const renderPrimaryWatchCta = (isMobile = false) => {
    // 1. Primary Source dengan URL valid
    if (primarySource && primarySource.sourceUrl) {
      return (
        <a
          className={`btn primary w-full text-center text-sm font-semibold flex items-center justify-center gap-2 shadow-md shadow-primary/25 cursor-pointer min-h-[44px] ${
            isMobile ? 'py-2.5' : ''
          }`}
          href={primarySource.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current flex-none" aria-hidden="true">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          <span className="truncate">Tonton di {primarySource.platformName}</span>
        </a>
      );
    }

    // 2. Primary Source tanpa URL (misal kaset fisik atau bioskop)
    if (primarySource && !primarySource.sourceUrl) {
      return (
        <div
          className={`w-full text-center text-xs sm:text-sm font-medium p-2.5 rounded-xl bg-surface-elevated border border-primary/40 text-text flex items-center justify-center gap-2 min-h-[44px] shadow-sm ${
            isMobile ? 'py-2.5' : ''
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-primary-bright flex-none animate-pulse" />
          <span className="truncate">
            Tersedia: {primarySource.platformName} ({getAccessTypeLabel(primarySource.accessType)})
          </span>
        </div>
      );
    }

    // 3. Fallback ke legacy movie.watchUrl jika ada
    if (hasSafeWatchUrl) {
      return (
        <a
          className={`btn primary w-full text-center text-sm font-semibold flex items-center justify-center gap-2 shadow-md shadow-primary/25 cursor-pointer min-h-[44px] ${
            isMobile ? 'py-2.5' : ''
          }`}
          href={movie.watchUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current flex-none" aria-hidden="true">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          <span className="truncate">Buka Tautan Nonton (Arsip)</span>
        </a>
      );
    }

    // 4. Belum ada primary source & belum ada legacy URL: Tombol Tambah Sumber
    return (
      <button
        type="button"
        onClick={() => {
          setEditingSource(null);
          setIsAddEditModalOpen(true);
        }}
        className={`btn primary w-full text-center text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-md shadow-primary/25 cursor-pointer min-h-[44px] ${
          isMobile ? 'py-2.5' : ''
        }`}
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-[2] flex-none" aria-hidden="true">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        <span>+ Tambah Sumber Tontonan</span>
      </button>
    );
  };

  const notesList = movie.log
    ? [
        { label: 'Tema Utama', value: movie.log.theme },
        { label: 'Adegan yang Nempel', value: movie.log.scene },
        { label: 'Angle Konten / Sudut Pandang', value: movie.log.angle },
        { label: 'Catatan Bebas', value: movie.log.notes },
      ].filter((x) => x.value && x.value.trim().length > 0)
    : [];

  return (
    <div className="space-y-6 sm:space-y-8 max-w-5xl mx-auto">
      {/* ─────────────────────────────────────────────────────────────
          BREADCRUMB & OSD DOSSIER WATERMARK
         ───────────────────────────────────────────────────────────── */}
      <nav aria-label="Breadcrumb" className="flex items-center justify-between">
        <Link
          href="/bank"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-muted hover:text-primary-bright transition-colors font-medium group min-h-[44px] py-2"
        >
          <svg
            viewBox="0 0 16 16"
            className="w-3.5 h-3.5 fill-current transition-transform group-hover:-translate-x-0.5"
            aria-hidden="true"
          >
            <path fillRule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z" />
          </svg>
          <span>Kembali ke Movie Bank</span>
        </Link>
        <span className="text-[10px] font-pixel uppercase tracking-widest text-muted/60 md:hidden">
          CINEMA DOSSIER // MOCAB
        </span>
      </nav>

      {/* ─────────────────────────────────────────────────────────────
          MOBILE COMPACT HERO (< md only)
          Brings Title, Poster, Metadata & Core Actions into 1st fold
         ───────────────────────────────────────────────────────────── */}
      <div className="md:hidden space-y-4">
        {/* Compact Hero Lockup: Poster + Identity */}
        <div className="flex gap-3.5 sm:gap-4 items-start">
          {/* Compact Poster Cover with Ambient Glow */}
          <div className="w-24 sm:w-32 flex-shrink-0 group/poster relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/25 via-neon-magenta/20 to-primary-bright/25 rounded-xl blur-md opacity-60" />
            <PosterCover
              title={movie.title}
              identifier={movie.tmdbId || movie.id}
              done={movie.done}
              year={movie.year}
              posterUrl={posterUrl || movie.posterUrl}
              big
              className="relative shadow-xl rounded-xl overflow-hidden aspect-[2/3] w-full"
            />
          </div>

          {/* Identity & Metadata Header */}
          <div className="flex-1 min-w-0 space-y-1.5 sm:space-y-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant={movie.done ? 'watched' : 'watchlist'} size="xs">
                {movie.done ? 'SUDAH DITONTON' : 'BELUM DITONTON'}
              </Badge>
              {movie.tmdbId && (
                <span className="text-[9px] font-pixel text-lavender/90 bg-surface-elevated border border-line px-1.5 py-0.5 rounded">
                  TMDB #{movie.tmdbId}
                </span>
              )}
            </div>

            <h1 className="font-serif font-bold text-lg sm:text-xl text-text tracking-tight leading-snug line-clamp-2">
              {movie.title}
            </h1>

            {/* Quick Metadata */}
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs font-mono text-muted flex-wrap">
              {movie.year && (
                <>
                  <span className="text-text font-medium">{movie.year}</span>
                  <span className="text-line">/</span>
                </>
              )}
              {movie.runtime && (
                <>
                  <span className="text-text-subtle">{movie.runtime}m</span>
                  <span className="text-line">/</span>
                </>
              )}
              <span className="text-muted/80">Digital</span>
            </div>
          </div>
        </div>

        {/* Mobile Primary Actions */}
        <div className="space-y-2 pt-2 border-t border-line/60">
          {renderPrimaryWatchCta(true)}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Link
              href={`/bank/${movie.id}/catat`}
              className="btn secondary w-full text-center text-xs sm:text-sm font-medium flex items-center justify-center gap-2 hover:border-primary-bright transition-all py-2.5 min-h-[44px]"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-[2]" aria-hidden="true">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              <span>{movie.done ? 'Edit Catatan Riset' : 'Catat Setelah Nonton'}</span>
            </Link>

            <div className="flex justify-center sm:justify-end items-center">
              <ConfirmInline
                isConfirming={isDeleting}
                onInitiate={() => setIsDeleting(true)}
                onConfirm={handleDeleteConfirm}
                onCancel={() => setIsDeleting(false)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MAIN DOSSIER GRID (Desktop 2-Col / Responsive Flow)
         ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] lg:grid-cols-[320px_1fr] gap-8 items-start">
        {/* Left Column: Poster Anchor & Direct Actions (Desktop only) */}
        <div className="hidden md:block space-y-5">
          <div className="sticky top-24 space-y-5">
            {/* Poster Anchor with subtle VHS ambient glow */}
            <div className="relative group/poster">
              <div className="absolute -inset-1.5 bg-gradient-to-r from-primary/20 via-neon-magenta/15 to-primary-bright/20 rounded-2xl blur-lg opacity-40 group-hover/poster:opacity-75 transition duration-500 pointer-events-none" />
              <PosterCover
                title={movie.title}
                identifier={movie.tmdbId || movie.id}
                done={movie.done}
                year={movie.year}
                posterUrl={posterUrl || movie.posterUrl}
                big
                className="relative shadow-2xl"
              />
            </div>

            {/* Quick Actions Panel */}
            <div className="space-y-2.5 pt-4 border-t border-line">
              {renderPrimaryWatchCta(false)}

              <Link
                href={`/bank/${movie.id}/catat`}
                className="btn secondary w-full text-center text-xs sm:text-sm font-medium flex items-center justify-center gap-2 hover:border-primary-bright transition-all min-h-[44px]"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-[2]" aria-hidden="true">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <span>{movie.done ? 'Edit Catatan Riset' : 'Catat Setelah Nonton'}</span>
              </Link>

              <div className="pt-2 flex justify-center">
                <ConfirmInline
                  isConfirming={isDeleting}
                  onInitiate={() => setIsDeleting(true)}
                  onConfirm={handleDeleteConfirm}
                  onCancel={() => setIsDeleting(false)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Editorial Record / Dossier Content */}
        <div className="space-y-6 sm:space-y-7">
          {/* Film Identity & Status Header (Desktop only) */}
          <section className="hidden md:block border-b border-line pb-6">
            <div className="flex items-center gap-2 mb-2.5 flex-wrap">
              <Badge variant={movie.done ? 'watched' : 'watchlist'} size="sm">
                {movie.done ? 'SUDAH DITONTON' : 'BELUM DITONTON'}
              </Badge>

              {movie.tmdbId && (
                <span className="text-[10px] font-pixel text-lavender/90 bg-surface-elevated border border-line px-2 py-0.5 rounded">
                  TMDB #{movie.tmdbId}
                </span>
              )}

              <span className="text-[10px] font-pixel uppercase tracking-widest text-muted/60 ml-auto hidden sm:inline-block">
                CINEMA DOSSIER // MOCAB
              </span>
            </div>

            <h1 className="font-serif font-bold text-2xl sm:text-3xl lg:text-4xl text-text tracking-tight leading-tight">
              {movie.title}
            </h1>

            {/* Metadata Ledger */}
            <div className="mt-3 flex items-center gap-2 sm:gap-3 text-xs sm:text-sm font-mono text-muted flex-wrap">
              {movie.year && (
                <>
                  <span className="text-text font-medium">{movie.year}</span>
                  <span className="text-line">/</span>
                </>
              )}
              {movie.runtime && (
                <>
                  <span className="text-text-subtle">{movie.runtime} menit</span>
                  <span className="text-line">/</span>
                </>
              )}
              <span className="text-muted/80">Format Digital</span>
            </div>
          </section>

          {/* Mood Assignment Section */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-pixel uppercase tracking-wider text-muted flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-bright" />
                <span>Kurasi Suasana / Mood</span>
              </h2>
              <span className="text-[11px] text-muted/60 font-mono">Ketuk untuk ubah</span>
            </div>
            <MoodChips
              moods={availableMoods.length > 0 ? availableMoods : movie.moods}
              selectedMoods={movie.moods}
              onToggle={handleToggleMood}
              wrap
            />
          </section>

          {/* Synopsis Section */}
          <section className="space-y-2">
            <h2 className="text-xs font-pixel uppercase tracking-wider text-muted flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-neon-magenta" />
              <span>Sinopsis</span>
            </h2>
            <div className="text-text/90 text-sm sm:text-base leading-relaxed max-w-2xl bg-surface/50 p-4 sm:p-5 rounded-xl border border-line">
              {movie.synopsis ? (
                <p>{movie.synopsis}</p>
              ) : (
                <p className="text-muted italic">Belum ada sinopsis untuk film ini.</p>
              )}
            </div>
          </section>

          {/* ─────────────────────────────────────────────────────────────
              WATCH SOURCES SECTION (Phase 16.2 Integration)
             ───────────────────────────────────────────────────────────── */}
          <section className="space-y-3" aria-labelledby="watch-sources-heading">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-lavender" />
                <h2 id="watch-sources-heading" className="text-xs font-pixel uppercase tracking-wider text-muted">
                  Sumber & Tautan Tontonan
                </h2>
                {watchSources.length > 0 && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface border border-line text-muted">
                    {watchSources.length}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingSource(null);
                  setIsAddEditModalOpen(true);
                }}
                className="text-xs font-mono font-medium text-primary-bright hover:text-primary-bright/80 flex items-center gap-1.5 cursor-pointer min-h-[36px] px-2.5 py-1 rounded-lg hover:bg-surface transition-colors"
              >
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
                  <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z" />
                </svg>
                <span>Tambah Sumber</span>
              </button>
            </div>

            {watchSources.length === 0 ? (
              <div className="p-4 sm:p-5 rounded-xl bg-surface/50 border border-line text-xs sm:text-sm text-muted space-y-2">
                {hasSafeWatchUrl ? (
                  <div className="space-y-2">
                    <p className="text-text/90 font-medium">Tautan Tontonan Warisan (Arsip):</p>
                    <div className="flex items-center gap-2 text-xs truncate bg-surface px-3 py-2 rounded-lg border border-line font-mono">
                      <a
                        href={movie.watchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-bright truncate hover:underline"
                      >
                        {movie.watchUrl}
                      </a>
                    </div>
                    <p className="text-[11px] text-muted/70">
                      Tautan ini tersimpan dari arsip lama. Anda dapat menambahkan sumber terstruktur (Netflix, Criterion, VHS fisik, dll.) melalui tombol &quot;Tambah Sumber&quot;.
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-4 space-y-2">
                    <p className="text-text/80 font-medium">Belum ada sumber tontonan tercatat.</p>
                    <p className="text-[11px] text-muted/70 max-w-sm mx-auto">
                      Catat ketersediaan film ini di platform streaming, persewaan, bioskop, atau koleksi media fisik Anda.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSource(null);
                        setIsAddEditModalOpen(true);
                      }}
                      className="btn secondary text-xs px-4 py-2 mt-1 min-h-[44px] cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <span>+ Tambah Sumber Sekarang</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {watchSources.map((source) => (
                  <div
                    key={source.id}
                    className={`card p-3.5 sm:p-4 rounded-xl border transition-all ${
                      source.isPrimary
                        ? 'border-primary/50 bg-surface-elevated/70 shadow-sm shadow-primary/10'
                        : 'border-line bg-surface/50 hover:border-line-hover'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                      {/* Left: Source Details */}
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-serif font-bold text-sm sm:text-base text-text">
                            {source.platformName}
                          </span>

                          {/* Access Type Badge */}
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-line bg-surface text-muted">
                            {getAccessTypeLabel(source.accessType)}
                          </span>

                          {/* Primary Badge */}
                          {source.isPrimary && (
                            <span className="text-[10px] font-pixel px-2 py-0.5 rounded bg-primary/20 text-primary-bright border border-primary/40 flex items-center gap-1">
                              <span>★</span>
                              <span>UTAMA</span>
                            </span>
                          )}
                        </div>

                        {/* URL / Physical info */}
                        {source.sourceUrl ? (
                          <div className="flex items-center gap-1.5 text-xs text-muted truncate">
                            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current text-primary-bright flex-none" aria-hidden="true">
                              <path d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z" />
                              <path d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z" />
                            </svg>
                            <a
                              href={source.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary-bright hover:underline truncate font-mono text-[11px]"
                            >
                              {source.sourceUrl}
                            </a>
                          </div>
                        ) : (
                          <p className="text-[11px] text-muted/70 italic font-mono">
                            Koleksi fisik / Tanpa tautan digital
                          </p>
                        )}

                        {/* Notes */}
                        {source.notes && (
                          <p className="text-xs text-text/80 bg-surface/40 px-2.5 py-1.5 rounded-lg border border-line/60 text-[11px] leading-relaxed">
                            {source.notes}
                          </p>
                        )}
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1.5 flex-none sm:self-center pt-2 sm:pt-0 border-t sm:border-t-0 border-line/40 w-full sm:w-auto justify-end">
                        {/* Open URL button */}
                        {source.sourceUrl && (
                          <a
                            href={source.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl text-xs font-medium text-primary-bright hover:bg-surface border border-line/60 hover:border-primary/40 flex items-center gap-1 transition-all"
                            title="Buka Tautan"
                            aria-label={`Buka tautan ${source.platformName}`}
                          >
                            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
                              <polygon points="4 2 13 8 4 14 4 2" />
                            </svg>
                            <span className="hidden sm:inline">Buka</span>
                          </a>
                        )}

                        {/* Set Primary Button */}
                        {!source.isPrimary && (
                          <button
                            type="button"
                            onClick={() => handleSetPrimary(source)}
                            disabled={isSettingPrimaryId === source.id}
                            className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium text-muted hover:text-text hover:bg-surface border border-line/60 hover:border-primary/40 flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                            title="Jadikan Sumber Utama"
                          >
                            {isSettingPrimaryId === source.id ? (
                              <span className="w-3.5 h-3.5 border border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                              <span>★</span>
                            )}
                            <span className="hidden sm:inline">Utama</span>
                          </button>
                        )}

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSource(source);
                            setIsAddEditModalOpen(true);
                          }}
                          className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl text-xs font-medium text-muted hover:text-text hover:bg-surface border border-line/60 hover:border-line flex items-center justify-center transition-all cursor-pointer"
                          title="Ubah Sumber"
                          aria-label={`Ubah sumber ${source.platformName}`}
                        >
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none stroke-[2]" aria-hidden="true">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                          <span className="hidden sm:inline ml-1">Ubah</span>
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => setSourceToDelete(source)}
                          className="min-h-[44px] min-w-[44px] px-3 py-2 rounded-xl text-xs font-medium text-neon-coral/80 hover:text-neon-coral hover:bg-neon-coral/10 border border-line/60 hover:border-neon-coral/30 flex items-center justify-center transition-all cursor-pointer"
                          title="Hapus Sumber"
                          aria-label={`Hapus sumber ${source.platformName}`}
                        >
                          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none stroke-[2]" aria-hidden="true">
                            <path d="M3 6h18" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                          <span className="hidden sm:inline ml-1">Hapus</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Journal Kurator (Strict: only rendered when real related journals exist) */}
          {relatedJournals && relatedJournals.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-pixel uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-lavender" />
                  <span>Journal Kurator</span>
                </h2>
                <span className="text-[11px] text-muted/60 font-mono">
                  {relatedJournals.length} Entri Terhubung
                </span>
              </div>
              <div className="space-y-2.5">
                {relatedJournals.map((entry) => (
                  <Link
                    key={entry.id}
                    href={`/journal/${entry.id}`}
                    className="card p-3.5 sm:p-4 hover:border-lavender/50 block transition-all group"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs font-mono text-muted">
                        {entry.entryDate}
                      </span>
                      <span className="text-[10px] font-pixel text-lavender/80 group-hover:text-lavender transition-colors">
                        BACA ENTRI →
                      </span>
                    </div>
                    <h3 className="font-serif font-bold text-sm sm:text-base text-text group-hover:text-lavender transition-colors">
                      {entry.title}
                    </h3>
                    {entry.resonanceNote && (
                      <p className="text-xs text-muted/80 mt-1 line-clamp-2 italic font-serif">
                        &ldquo;{entry.resonanceNote}&rdquo;
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* FilmStrip Ornament divider */}
          <FilmStripDivider label="CINEMA DOSSIER // NOTES" />

          {/* Creator Archive / The Writer's Room Research Notes */}
          {movie.done && movie.log ? (
            <section className="border border-line rounded-2xl bg-surface/60 p-5 sm:p-6 space-y-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-line pb-3.5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="analysis" size="xs">CREATOR ARCHIVE</Badge>
                    <span className="text-[11px] font-pixel tracking-wider text-lavender uppercase">
                      The Writer&apos;s Room
                    </span>
                    <span className="text-[10px] font-pixel text-muted/60 tracking-wider ml-auto hidden sm:inline" aria-hidden="true">
                      BERUANG SASTRA // RESEARCH NOTE
                    </span>
                  </div>
                  <h3 className="font-serif font-semibold text-lg sm:text-xl text-text">
                    Catatan Riset & Bedah Sinema
                  </h3>
                </div>

                <Link
                  href={`/bank/${movie.id}/catat`}
                  className="text-xs font-medium text-primary-bright hover:text-neon-magenta transition-colors flex items-center gap-1 group"
                >
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none stroke-[2] transition-transform group-hover:scale-110" aria-hidden="true">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  <span>Edit Catatan</span>
                </Link>
              </div>

              {/* Score indicators */}
              <div className="grid grid-cols-2 gap-3.5 max-w-sm">
                <div className="bg-surface-elevated/90 p-4 rounded-xl border border-line">
                  <span className="text-xs font-mono uppercase tracking-wider text-muted block">Rating Film</span>
                  <div className="font-serif font-bold text-2xl sm:text-3xl text-text mt-1">
                    {movie.log.rating}
                    <span className="text-xs font-mono font-normal text-muted/60 ml-1">/10</span>
                  </div>
                </div>
                <div className="bg-surface-elevated/90 p-4 rounded-xl border border-line">
                  <span className="text-xs font-mono uppercase tracking-wider text-neon-magenta block">Potensi Konten</span>
                  <div className="font-serif font-bold text-2xl sm:text-3xl text-neon-magenta mt-1">
                    {movie.log.contentPotential}
                    <span className="text-xs font-mono font-normal text-muted/60 ml-1">/10</span>
                  </div>
                </div>
              </div>

              {/* Research Fields */}
              <div className="space-y-4 pt-1">
                {notesList.map((item) => (
                  <div key={item.label} className="space-y-1.5">
                    <span className="text-xs font-pixel uppercase tracking-wider text-lavender/90">
                      {item.label}
                    </span>
                    <p className="text-text text-sm sm:text-[15px] leading-relaxed whitespace-pre-line bg-surface-elevated/50 p-4 rounded-xl border border-line/60">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <section className="rounded-2xl border border-dashed border-line bg-surface/30 p-6 text-center space-y-3">
              <p className="text-sm text-muted">
                Belum ada catatan riset untuk film ini. Selesai menonton?
              </p>
              <Link
                href={`/bank/${movie.id}/catat`}
                className="btn primary text-xs sm:text-sm font-semibold inline-flex items-center gap-2 cursor-pointer shadow-md shadow-primary/20"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-[2]" aria-hidden="true">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <span>Catat Ide & Review Sekarang</span>
              </Link>
            </section>
          )}

          {/* TMDB Official Attribution bila film terhubung dengan TMDB */}
          {Boolean(movie.tmdbId) && (
            <section className="pt-6 border-t border-line">
              <TmdbAttribution />
            </section>
          )}
        </div>
      </div>

      {/* Watch Source Add / Edit Modal */}
      <WatchSourceModal
        isOpen={isAddEditModalOpen}
        onClose={() => {
          setIsAddEditModalOpen(false);
          setEditingSource(null);
        }}
        movieId={movie.id}
        initialData={editingSource}
        onSuccess={handleModalSuccess}
      />

      {/* Watch Source Delete Confirmation Dialog */}
      <DeleteWatchSourceDialog
        isOpen={Boolean(sourceToDelete)}
        source={sourceToDelete}
        isDeleting={isDeletingSource}
        onConfirm={handleDeleteSourceConfirm}
        onCancel={() => setSourceToDelete(null)}
      />
    </div>
  );
}
