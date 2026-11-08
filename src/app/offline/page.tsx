'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function OfflinePage() {
  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center py-10 px-4">
      <div className="max-w-md w-full mx-auto text-center space-y-6">
        {/* VHS Signal Loss Indicator */}
        <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl animate-pulse pointer-events-none" />
          <div className="relative w-18 h-18 rounded-2xl bg-surface border border-line flex items-center justify-center p-3 shadow-lg aspect-square">
            <Image
              src="/brand/avatar-paw.webp"
              alt="MOCAB Beruang Sastra"
              width={48}
              height={48}
              className="w-full h-full object-contain grayscale opacity-80"
              priority
            />
          </div>
          {/* OSD Status Badge */}
          <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded bg-danger/20 border border-danger/40 text-[9px] font-pixel text-danger tracking-wider uppercase">
            NO SIGNAL
          </div>
        </div>

        {/* Cinematic OSD Ledger */}
        <div className="flex items-center justify-center gap-2 text-xs font-pixel tracking-wider uppercase text-lavender flex-wrap">
          <span className="px-2 py-0.5 rounded bg-surface-elevated border border-line text-[10px] text-muted">
            VHS TAPE PAUSED
          </span>
          <span className="text-muted/40">/</span>
          <span className="text-neon-magenta text-[10px]">OFFLINE MODE</span>
        </div>

        {/* Heading & Explanation */}
        <div className="space-y-2">
          <h1 className="font-serif font-bold text-2xl sm:text-3xl text-text tracking-tight">
            Koneksi Internet Terputus
          </h1>
          <p className="text-muted text-xs sm:text-sm leading-relaxed max-w-sm mx-auto">
            Movie Cabin (MOCAB) membutuhkan jaringan internet untuk memuat perpustakaan film, catatan riset esai, sinkronisasi Supabase, dan pencarian TMDB.
          </p>
        </div>

        {/* Warning Callout */}
        <div className="card p-4 bg-surface border border-line/80 text-left space-y-2 text-xs text-muted">
          <div className="flex items-center gap-2 font-pixel text-[10px] text-text uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-danger animate-ping" />
            <span>Mode Cadangan Offline</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            Data film tidak disimpan secara offline untuk melindungi integritas dan privasi catatan tontonan lu. Hubungkan kembali perangkat lu ke Wi-Fi atau data seluler.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleReload}
            className="btn primary w-full sm:w-auto text-xs py-2.5 px-6 font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-primary/20"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4 stroke-current fill-none stroke-[2]"
              aria-hidden="true"
            >
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            <span>Coba Hubungkan Kembali</span>
          </button>

          <Link
            href="/"
            className="btn secondary w-full sm:w-auto text-xs py-2.5 px-5 font-pixel tracking-wide flex items-center justify-center gap-1.5"
          >
            <span>Buka Beranda</span>
          </Link>
        </div>

        {/* Vintage OSD Footer */}
        <div className="pt-4 border-t border-line/40 text-[10px] font-pixel text-muted/60 tracking-wider">
          MOCAB // RETRO VHS CINEMA // V1.0 PWA
        </div>
      </div>
    </div>
  );
}
