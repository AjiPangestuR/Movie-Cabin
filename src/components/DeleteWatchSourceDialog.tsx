'use client';

import React, { useEffect } from 'react';
import { type WatchSource, getAccessTypeLabel } from '@/types';

interface DeleteWatchSourceDialogProps {
  isOpen: boolean;
  source: WatchSource | null;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteWatchSourceDialog({
  isOpen,
  source,
  isDeleting,
  onConfirm,
  onCancel,
}: DeleteWatchSourceDialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isDeleting) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, onCancel]);

  if (!isOpen || !source) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-source-title"
      aria-describedby="delete-source-desc"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) onCancel();
      }}
    >
      <div className="relative w-full max-w-md bg-surface-elevated/95 border border-line sm:rounded-2xl shadow-2xl p-5 sm:p-6 text-text flex flex-col space-y-4 animate-slide-up sm:animate-scale-in">
        {/* Warning Badge & Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-neon-coral/15 border border-neon-coral/30 flex items-center justify-center text-neon-coral flex-none">
            <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none stroke-[2]" aria-hidden="true">
              <path d="M3 6h18" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </div>
          <div>
            <span className="text-[10px] font-pixel uppercase tracking-widest text-neon-coral">
              Konfirmasi Penghapusan
            </span>
            <h3 id="delete-source-title" className="font-serif font-bold text-base sm:text-lg text-text">
              Hapus Sumber Tontonan?
            </h3>
          </div>
        </div>

        {/* Source Summary Card */}
        <div id="delete-source-desc" className="p-3.5 rounded-xl bg-surface/60 border border-line text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-medium text-text text-sm">{source.platformName}</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-surface border border-line text-muted">
              {getAccessTypeLabel(source.accessType)}
            </span>
          </div>
          {source.sourceUrl && (
            <p className="text-muted/70 truncate font-mono text-[11px]">{source.sourceUrl}</p>
          )}
          {source.isPrimary && (
            <p className="text-primary-bright font-mono text-[11px] pt-1">
              ★ Sumber ini sedang ditandai sebagai Sumber Utama. Sumber lain yang tersisa akan otomatis dipromosikan sebagai sumber utama.
            </p>
          )}
        </div>

        <p className="text-xs text-muted leading-relaxed">
          Tautan tontonan ini akan dihapus dari arsip film. Tindakan ini tidak dapat dibatalkan.
        </p>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="min-h-[44px] px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-muted hover:text-text hover:bg-surface transition-colors cursor-pointer disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="btn danger min-h-[44px] px-5 py-2.5 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Menghapus...</span>
              </>
            ) : (
              <span>Ya, Hapus Sumber</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
