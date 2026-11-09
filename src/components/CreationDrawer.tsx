'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';

interface CreationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreationDrawer({ isOpen, onClose }: CreationDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const firstActionRef = useRef<HTMLAnchorElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Touch drag-to-dismiss state
  const touchStartY = useRef<number>(0);
  const touchCurrentY = useRef<number>(0);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll and manage focus (trap & restore)
  useEffect(() => {
    if (!isOpen) return;

    previousActiveElement.current = document.activeElement as HTMLElement;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus first actionable element for accessibility
    const timer = setTimeout(() => {
      firstActionRef.current?.focus();
    }, 50);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = originalOverflow;
      // Restore focus to triggering button
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen]);

  // Touch gesture handlers for drag-down dismissal
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchCurrentY.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchCurrentY.current = e.touches[0].clientY;
    const delta = touchCurrentY.current - touchStartY.current;
    if (delta > 0) {
      // User is dragging downwards
      setDragOffset(delta);
    }
  };

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    const delta = touchCurrentY.current - touchStartY.current;
    // Dismiss threshold: 75px downward drag
    if (delta > 75) {
      onClose();
    }
    setDragOffset(0);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="creation-drawer-title"
      data-testid="creation-drawer"
      className="fixed inset-0 z-50 flex flex-col justify-end"
    >
      {/* ─────────────────────────────────────────────────────────────
          BACKDROP OVERLAY
         ───────────────────────────────────────────────────────────── */}
      <div
        data-testid="creation-drawer-backdrop"
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity duration-200"
        aria-hidden="true"
      />

      {/* ─────────────────────────────────────────────────────────────
          DRAWER BOTTOM SHEET
         ───────────────────────────────────────────────────────────── */}
      <div
        ref={drawerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
          transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className="relative z-10 w-full max-w-lg mx-auto rounded-t-3xl border-t border-line/90 bg-surface-elevated/95 backdrop-blur-xl p-5 sm:p-6 pb-[calc(24px+env(safe-area-inset-bottom))] shadow-2xl transition-transform duration-200 select-none"
      >
        {/* Top Handle Bar for Touch UI Drag-to-Dismiss */}
        <div
          className="w-12 h-1.5 rounded-full bg-muted/40 mx-auto mb-4 cursor-grab active:cursor-grabbing hover:bg-muted/60 transition-colors"
          aria-hidden="true"
        />

        {/* Header & Close Button */}
        <div className="flex items-start justify-between gap-4 mb-5 border-b border-line/60 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-pixel uppercase bg-primary/15 text-primary-bright border border-primary/30">
                CREATION CONSOLE
              </span>
              <span className="text-[10px] font-pixel text-muted tracking-wider uppercase">
                KREASI BARU
              </span>
            </div>
            <h2
              id="creation-drawer-title"
              className="font-serif font-bold text-xl sm:text-2xl text-text tracking-tight"
            >
              Pilih Aksi Kreasi
            </h2>
            <p className="text-muted text-xs sm:text-sm mt-1 leading-relaxed">
              Rekam film ke rak koleksi, tuangkan renungan batin harian, atau tangkap ide kilat.
            </p>
          </div>

          <button
            type="button"
            data-testid="creation-drawer-close"
            onClick={onClose}
            aria-label="Tutup menu kreasi"
            className="p-2 rounded-xl text-muted hover:text-text hover:bg-surface border border-line/60 transition-colors cursor-pointer flex-none focus-visible:outline-2 focus-visible:outline-primary"
          >
            <svg viewBox="0 0 16 16" className="w-4 h-4 fill-current" aria-hidden="true">
              <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z" />
            </svg>
          </button>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            THREE CREATION ACTIONS
           ───────────────────────────────────────────────────────────── */}
        <div className="space-y-3" role="menu">
          {/* Action 1: Rekam Film Baru */}
          <Link
            ref={firstActionRef}
            href="/add"
            data-testid="action-add-movie"
            role="menuitem"
            onClick={onClose}
            className="group flex items-center justify-between gap-4 p-3.5 sm:p-4 rounded-2xl border border-line bg-surface/70 hover:border-primary/50 hover:bg-surface hover:shadow-md transition-all duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-primary"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-primary/15 text-primary-bright border border-primary/30 flex items-center justify-center flex-none group-hover:scale-105 transition-transform shadow-xs">
                <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none stroke-[2]" aria-hidden="true">
                  <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
                  <line x1="7" y1="2" x2="7" y2="22" />
                  <line x1="17" y1="17" x2="17" y2="22" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <line x1="2" y1="7" x2="7" y2="7" />
                  <line x1="2" y1="17" x2="7" y2="17" />
                  <line x1="17" y1="17" x2="22" y2="17" />
                  <line x1="17" y1="7" x2="22" y2="7" />
                </svg>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif font-bold text-sm sm:text-base text-text group-hover:text-primary-bright transition-colors">
                    Rekam Film Baru
                  </h3>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-pixel bg-primary/10 text-primary-bright uppercase">
                    MOVIE
                  </span>
                </div>
                <p className="text-muted text-xs mt-0.5 line-clamp-1">
                  Tambah film dan buat catatan tontonan ke perpustakaan.
                </p>
              </div>
            </div>

            <svg viewBox="0 0 16 16" className="w-4 h-4 fill-muted group-hover:text-primary-bright group-hover:translate-x-0.5 transition-all flex-none" aria-hidden="true">
              <path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06z" />
            </svg>
          </Link>

          {/* Action 2: Tulis Jurnal */}
          <Link
            href="/journal/new"
            data-testid="action-new-journal"
            role="menuitem"
            onClick={onClose}
            className="group flex items-center justify-between gap-4 p-3.5 sm:p-4 rounded-2xl border border-line bg-surface/70 hover:border-neon-magenta/50 hover:bg-surface hover:shadow-md transition-all duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-neon-magenta"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-neon-magenta/15 text-neon-magenta border border-neon-magenta/30 flex items-center justify-center flex-none group-hover:scale-105 transition-transform shadow-xs">
                <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none stroke-[2]" aria-hidden="true">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  <line x1="8" y1="7" x2="16" y2="7" />
                  <line x1="8" y1="11" x2="14" y2="11" />
                </svg>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif font-bold text-sm sm:text-base text-text group-hover:text-neon-magenta transition-colors">
                    Tulis Jurnal
                  </h3>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-pixel bg-neon-magenta/10 text-neon-magenta uppercase">
                    JOURNAL
                  </span>
                </div>
                <p className="text-muted text-xs mt-0.5 line-clamp-1">
                  Tuangkan fragmen hari, renungan batin, dan resonansi sinema.
                </p>
              </div>
            </div>

            <svg viewBox="0 0 16 16" className="w-4 h-4 fill-muted group-hover:text-neon-magenta group-hover:translate-x-0.5 transition-all flex-none" aria-hidden="true">
              <path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06z" />
            </svg>
          </Link>

          {/* Action 3: Catatan Cepat */}
          <Link
            href="/notes/new"
            data-testid="action-new-note"
            role="menuitem"
            onClick={onClose}
            className="group flex items-center justify-between gap-4 p-3.5 sm:p-4 rounded-2xl border border-line bg-surface/70 hover:border-amber/50 hover:bg-surface hover:shadow-md transition-all duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-amber"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber/15 text-amber border border-amber/30 flex items-center justify-center flex-none group-hover:scale-105 transition-transform shadow-xs">
                <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none stroke-[2]" aria-hidden="true">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif font-bold text-sm sm:text-base text-text group-hover:text-amber transition-colors">
                    Catatan Cepat
                  </h3>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-pixel bg-amber/10 text-amber uppercase">
                    MEMO
                  </span>
                </div>
                <p className="text-muted text-xs mt-0.5 line-clamp-1">
                  Tangkap ide kilat, kutipan dialog, atau potongan inspirasi.
                </p>
              </div>
            </div>

            <svg viewBox="0 0 16 16" className="w-4 h-4 fill-muted group-hover:text-amber group-hover:translate-x-0.5 transition-all flex-none" aria-hidden="true">
              <path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06z" />
            </svg>
          </Link>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            SECONDARY LINK: BROWSE EXISTING JOURNALS
           ───────────────────────────────────────────────────────────── */}
        <div className="pt-3.5 mt-3 border-t border-line/60 flex items-center justify-between gap-3 text-xs flex-wrap">
          <span className="text-muted text-[11px] sm:text-xs">
            Ingin membaca tulisan sebelumnya?
          </span>
          <Link
            href="/journal"
            onClick={onClose}
            data-testid="drawer-link-journal"
            className="min-h-[44px] inline-flex items-center gap-1.5 font-medium text-primary-bright hover:text-neon-magenta transition-colors active:scale-95 focus-visible:outline-2 focus-visible:outline-primary py-2 px-1"
          >
            <span>Buka Jurnal Saya</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
