'use client';

import React, { useState, useEffect } from 'react';
import {
  type WatchSource,
  type AccessType,
  ACCESS_TYPES,
  ACCESS_TYPE_LABELS,
} from '@/types';
import { createWatchSource, updateWatchSource } from '@/lib/watchSources';

interface WatchSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  movieId: string;
  initialData?: WatchSource | null;
  onSuccess: (source: WatchSource, isEdit: boolean) => void;
}

const PRESET_PLATFORMS: Array<{ name: string; defaultType: AccessType }> = [
  { name: 'Netflix', defaultType: 'subscription' },
  { name: 'Prime Video', defaultType: 'subscription' },
  { name: 'Disney+', defaultType: 'subscription' },
  { name: 'YouTube', defaultType: 'free' },
  { name: 'Criterion Channel', defaultType: 'subscription' },
  { name: 'Vidio', defaultType: 'subscription' },
  { name: 'Bioskop Online', defaultType: 'rent' },
  { name: 'Koleksi Kaset VHS', defaultType: 'physical' },
];

interface WatchSourceFormContentProps {
  movieId: string;
  initialData?: WatchSource | null;
  onClose: () => void;
  onSuccess: (source: WatchSource, isEdit: boolean) => void;
}

function WatchSourceFormContent({
  movieId,
  initialData,
  onClose,
  onSuccess,
}: WatchSourceFormContentProps) {
  const isEdit = Boolean(initialData);

  const [platformName, setPlatformName] = useState(initialData?.platformName || '');
  const [sourceUrl, setSourceUrl] = useState(initialData?.sourceUrl || '');
  const [accessType, setAccessType] = useState<AccessType>(initialData?.accessType || 'subscription');
  const [isPrimary, setIsPrimary] = useState(Boolean(initialData?.isPrimary));
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleApplyPreset = (preset: { name: string; defaultType: AccessType }) => {
    setPlatformName(preset.name);
    setAccessType(preset.defaultType);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedPlatform = platformName.trim();
    if (!trimmedPlatform) {
      setErrorMessage('Nama platform wajib diisi.');
      return;
    }

    const trimmedUrl = sourceUrl.trim();
    if (trimmedUrl && !/^https?:\/\/\S+$/i.test(trimmedUrl)) {
      setErrorMessage('Tautan harus berupa URL HTTP/HTTPS yang valid.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isEdit && initialData) {
        const updated = await updateWatchSource(initialData.id, {
          platformName: trimmedPlatform,
          sourceUrl: trimmedUrl || null,
          accessType,
          isPrimary,
          notes: notes.trim() || null,
        });
        onSuccess(updated, true);
        onClose();
      } else {
        const created = await createWatchSource({
          movieId,
          platformName: trimmedPlatform,
          sourceUrl: trimmedUrl || null,
          accessType,
          isPrimary,
          notes: notes.trim() || null,
        });
        onSuccess(created, false);
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan saat menyimpan sumber.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto bg-surface-elevated/95 border border-line sm:rounded-2xl shadow-2xl flex flex-col text-text animate-slide-up sm:animate-scale-in">
      {/* Modal Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-line/80 bg-surface/80 sticky top-0 z-10 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary-bright animate-pulse" />
          <span className="text-[10px] font-pixel uppercase tracking-widest text-primary-bright">
            {isEdit ? 'Koreksi Arsip' : 'Entri Baru'}
          </span>
          <span className="text-line text-xs font-mono">/</span>
          <h2 id="watch-source-modal-title" className="font-serif font-bold text-base sm:text-lg text-text">
            {isEdit ? 'Ubah Sumber Tontonan' : 'Tambah Sumber Tontonan'}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="w-11 h-11 flex items-center justify-center rounded-xl text-muted hover:text-text hover:bg-surface transition-colors cursor-pointer disabled:opacity-50"
          aria-label="Tutup dialog"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none stroke-[2]" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Modal Form */}
      <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-neon-coral/10 border border-neon-coral/30 text-neon-coral text-xs sm:text-sm flex items-start gap-2.5">
            <svg viewBox="0 0 24 24" className="w-4 h-4 flex-none stroke-current fill-none stroke-[2] mt-0.5" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Quick Platform Presets */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-pixel uppercase tracking-wider text-muted">
            Pilihan Cepat Platform
          </label>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_PLATFORMS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer min-h-[36px] flex items-center ${
                  platformName.toLowerCase() === preset.name.toLowerCase()
                    ? 'bg-primary/20 border-primary-bright text-text font-medium'
                    : 'bg-surface/60 border-line text-muted hover:text-text hover:border-line-hover'
                }`}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Platform Name */}
        <div className="space-y-1.5">
          <label htmlFor="ws-platform" className="text-xs font-mono font-medium text-text flex items-center justify-between">
            <span>Nama Platform / Sumber <span className="text-neon-coral">*</span></span>
            <span className="text-[10px] text-muted">{platformName.length}/100</span>
          </label>
          <input
            id="ws-platform"
            type="text"
            required
            maxLength={100}
            value={platformName}
            onChange={(e) => setPlatformName(e.target.value)}
            placeholder="Misal: Criterion Channel, Netflix, Kaset VHS..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-line text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-primary-bright focus:ring-1 focus:ring-primary-bright transition-all min-h-[44px]"
          />
        </div>

        {/* Access Type Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-mono font-medium text-text">
            Tipe Akses <span className="text-neon-coral">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ACCESS_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setAccessType(type)}
                className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium border flex items-center justify-center text-center transition-all cursor-pointer ${
                  accessType === type
                    ? 'bg-primary/25 border-primary-bright text-text font-semibold shadow-sm'
                    : 'bg-surface/50 border-line text-muted hover:text-text hover:border-line-hover'
                }`}
              >
                {ACCESS_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        {/* Source URL */}
        <div className="space-y-1.5">
          <label htmlFor="ws-url" className="text-xs font-mono font-medium text-text flex items-center justify-between">
            <span>Tautan Nonton (URL)</span>
            <span className="text-[10px] text-muted">Opsional</span>
          </label>
          <input
            id="ws-url"
            type="url"
            maxLength={2048}
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-line text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-primary-bright focus:ring-1 focus:ring-primary-bright transition-all min-h-[44px]"
          />
          <p className="text-[11px] text-muted/70 leading-relaxed">
            Kosongkan jika sumber adalah rilisan fisik (kaset VHS, DVD, LaserDisc) atau bioskop.
          </p>
        </div>

        {/* Primary Source Toggle */}
        <div className="p-3.5 rounded-xl bg-surface/40 border border-line space-y-1">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="w-5 h-5 rounded bg-surface border border-line text-primary focus:ring-0 focus:outline-none cursor-pointer accent-primary"
            />
            <span className="text-xs sm:text-sm font-medium text-text">
              Jadikan Sumber Tontonan Utama
            </span>
          </label>
          <p className="text-[11px] text-muted/70 pl-8">
            Tombol tonton pada halaman utama dan detail film akan mengarah ke sumber ini.
          </p>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label htmlFor="ws-notes" className="text-xs font-mono font-medium text-text flex items-center justify-between">
            <span>Catatan Khusus Kurator</span>
            <span className="text-[10px] text-muted">{notes.length}/500</span>
          </label>
          <textarea
            id="ws-notes"
            rows={2}
            maxLength={500}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Contoh: Edisi Criterion Collection 4K, Subtitle Indonesia, dll..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-surface border border-line text-xs sm:text-sm text-text placeholder:text-muted/50 focus:outline-none focus:border-primary-bright focus:ring-1 focus:ring-primary-bright transition-all resize-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-end gap-3 border-t border-line/60">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="min-h-[44px] px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium text-muted hover:text-text hover:bg-surface transition-colors cursor-pointer disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn primary min-h-[44px] px-6 py-2.5 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-md shadow-primary/25 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <span>{isEdit ? 'Simpan Perubahan' : 'Tambahkan Sumber'}</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export function WatchSourceModal({
  isOpen,
  onClose,
  movieId,
  initialData,
  onSuccess,
}: WatchSourceModalProps) {
  // Handle keyboard Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="watch-source-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <WatchSourceFormContent
        key={initialData ? initialData.id : 'new-source'}
        movieId={movieId}
        initialData={initialData}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </div>
  );
}
