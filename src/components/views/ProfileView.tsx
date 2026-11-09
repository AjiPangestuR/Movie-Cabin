'use client';

import React, { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Movie, Mood } from '@/types';
import { Badge } from '@/components/Badge';
import { ThemeToggle } from '@/components/ThemeToggle';
import { FilmStripDivider } from '@/components/FilmStripDivider';
import { signOutAction } from '@/app/auth/actions';

interface ProfileViewProps {
  userEmail: string;
  movies: Movie[];
  moods: Mood[];
}

// Standalone mode external store subscription
function subscribeStandalone(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  const media = window.matchMedia('(display-mode: standalone)');
  media.addEventListener('change', callback);
  window.addEventListener('mocab-pwa-installed', callback);
  return () => {
    media.removeEventListener('change', callback);
    window.removeEventListener('mocab-pwa-installed', callback);
  };
}

function getStandaloneSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  const isMediaStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isIosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return isMediaStandalone || isIosStandalone;
}

// Installable deferred prompt external store subscription
function subscribeInstallable(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('mocab-pwa-installable', callback);
  window.addEventListener('mocab-pwa-installed', callback);
  return () => {
    window.removeEventListener('mocab-pwa-installable', callback);
    window.removeEventListener('mocab-pwa-installed', callback);
  };
}

function getInstallableSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(window.__MOCAB_DEFERRED_PROMPT);
}

// iOS user agent snapshot
function getIsIosSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  const userAgent = window.navigator.userAgent || '';
  return /iPhone|iPad|iPod/i.test(userAgent) && !(window as unknown as { MSStream?: boolean }).MSStream;
}

function subscribeNoop() {
  return () => {};
}

export function ProfileView({ userEmail, movies, moods }: ProfileViewProps) {
  const totalMovies = movies.length;
  const watchedCount = movies.filter((m) => m.done).length;
  const unwatchedCount = totalMovies - watchedCount;
  const totalMoods = moods.length;

  const watchedPercent = totalMovies > 0 ? Math.round((watchedCount / totalMovies) * 100) : 0;

  // PWA Install Experience state using standard React 18/19 useSyncExternalStore
  const isStandalone = useSyncExternalStore(subscribeStandalone, getStandaloneSnapshot, () => false);
  const canInstall = useSyncExternalStore(subscribeInstallable, getInstallableSnapshot, () => false);
  const isIos = useSyncExternalStore(subscribeNoop, getIsIosSnapshot, () => false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  const handleInstallClick = async () => {
    if (window.__MOCAB_DEFERRED_PROMPT) {
      const promptEvent = window.__MOCAB_DEFERRED_PROMPT;
      promptEvent.prompt();
      await promptEvent.userChoice;
      window.__MOCAB_DEFERRED_PROMPT = undefined;
      window.dispatchEvent(new CustomEvent('mocab-pwa-installed'));
    } else if (isIos) {
      setShowIosGuide((prev) => !prev);
    }
  };

  return (
    <div className="space-y-8 sm:space-y-10 max-w-4xl mx-auto pb-8">
      {/* ─────────────────────────────────────────────────────────────
          EDITORIAL HEADER
         ───────────────────────────────────────────────────────────── */}
      <section className="border-b border-line pb-6">
        <div className="flex items-center gap-2 mb-2 text-xs font-pixel tracking-wider uppercase text-lavender flex-wrap">
          <Badge variant="movie" size="xs">
            PROFILE // ACCOUNT
          </Badge>
          <span className="text-muted/40">/</span>
          <span>Setelan & Preferensi</span>
          <span
            className="text-[10px] font-pixel text-muted/60 tracking-wider ml-auto hidden sm:inline"
            aria-hidden="true"
          >
            CABIN OPERATOR // ARCHIVE
          </span>
        </div>
        <h1 className="font-serif font-bold text-3xl sm:text-4xl text-text tracking-tight">
          Profil & Pengaturan
        </h1>
        <p className="text-muted text-sm mt-1.5 leading-relaxed max-w-2xl">
          Kelola sesi akun aktif, preferensi tema tampilan bioskop, serta ringkasan kurasi film di Movie Cabin.
        </p>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION A: ACCOUNT IDENTITY (Beruang Sastra Branding)
         ───────────────────────────────────────────────────────────── */}
      <section className="card p-5 sm:p-6 bg-surface border border-line space-y-4">
        <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
          <div className="flex items-center gap-4">
            {/* Beruang Sastra Paw Avatar Stamp */}
            <div className="relative w-14 h-14 rounded-2xl bg-surface-elevated border border-line flex items-center justify-center p-2 shadow-xs aspect-square flex-none">
              <Image
                src="/brand/avatar-paw.webp"
                alt="Avatar Beruang Sastra"
                width={36}
                height={36}
                className="w-full h-full object-contain"
                priority
              />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-pixel text-[10px] text-neon-magenta tracking-wider uppercase">
                  BERUANG SASTRA // CABIN ARCHIVIST
                </span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-ok" />
              </div>
              <h2 className="font-serif font-bold text-lg sm:text-xl text-text mt-0.5 break-all">
                {userEmail || 'Akun Pengguna'}
              </h2>
              <p className="text-xs text-muted font-mono mt-0.5">
                Sesi autentikasi terhubung aktif via Supabase Auth
              </p>
            </div>
          </div>

          <Badge variant="watched" size="sm" className="self-start sm:self-auto flex-none">
            AKUN TERVERIFIKASI
          </Badge>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION B: COLLECTION STATISTICS
         ───────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-line/60 pb-2">
          <h2 className="font-serif font-bold text-lg sm:text-xl text-text flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary-bright" />
            <span>Statistik Koleksi Sinema</span>
          </h2>
          <span className="text-xs font-mono text-muted">
            {totalMovies} Total Judul
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {/* Stat 1: Total Movies */}
          <div className="card p-4 sm:p-5 bg-surface border border-line space-y-1">
            <span className="text-[10px] font-pixel text-muted uppercase tracking-wider">
              TOTAL FILM
            </span>
            <div className="text-3xl font-serif font-bold text-text">
              {totalMovies}
            </div>
            <p className="text-xs text-muted/80">
              Judul film tersimpan dalam perpustakaan pribadi
            </p>
          </div>

          {/* Stat 2: Watched Movies */}
          <div className="card p-4 sm:p-5 bg-surface border border-line space-y-1">
            <span className="text-[10px] font-pixel text-ok uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-ok" />
              <span>SUDAH DITONTON</span>
            </span>
            <div className="text-3xl font-serif font-bold text-primary-bright">
              {watchedCount}
            </div>
            <p className="text-xs text-muted/80">
              {unwatchedCount} belum ditonton ({watchedPercent}% terarsip)
            </p>
          </div>

          {/* Stat 3: Available Moods */}
          <div className="card p-4 sm:p-5 bg-surface border border-line space-y-1">
            <span className="text-[10px] font-pixel text-lavender uppercase tracking-wider">
              SPEKTRUM MOOD
            </span>
            <div className="text-3xl font-serif font-bold text-neon-magenta">
              {totalMoods}
            </div>
            <p className="text-xs text-muted/80">
              Kategori mood untuk kurasi riset esai film
            </p>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION B.2: RUANG TULIS & REFLEKSI SINEMA (Journal & Notes Shortcuts)
         ───────────────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-line/60 pb-2">
          <h2 className="font-serif font-bold text-lg sm:text-xl text-text flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-lavender" />
            <span>Ruang Tulis & Refleksi Sinema</span>
          </h2>
          <span className="text-xs font-mono text-muted hidden sm:inline">
            Akses Kurasi Pribadi
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {/* Shortcut 1: My Journal */}
          <Link
            href="/journal"
            data-testid="profile-shortcut-journal"
            className="card p-4 sm:p-5 bg-surface border border-line hover:border-neon-magenta/50 hover:bg-surface-elevated transition-all duration-150 flex flex-col justify-between group min-h-[52px] active:scale-[0.98] cursor-pointer"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-neon-magenta/15 text-neon-magenta border border-neon-magenta/30 flex items-center justify-center flex-none group-hover:scale-105 transition-transform shadow-xs">
                <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none stroke-[2]" aria-hidden="true">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  <line x1="8" y1="7" x2="16" y2="7" />
                  <line x1="8" y1="11" x2="14" y2="11" />
                </svg>
              </div>
              <span className="text-[9px] font-pixel px-2 py-0.5 rounded bg-neon-magenta/10 text-neon-magenta uppercase tracking-wider">
                STREAM
              </span>
            </div>
            <div>
              <div className="flex items-center justify-between gap-1">
                <h3 className="font-serif font-bold text-sm sm:text-base text-text group-hover:text-neon-magenta transition-colors">
                  My Journal
                </h3>
                <svg viewBox="0 0 16 16" className="w-4 h-4 fill-muted group-hover:text-neon-magenta group-hover:translate-x-0.5 transition-all flex-none" aria-hidden="true">
                  <path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06z" />
                </svg>
              </div>
              <p className="text-xs text-muted/80 mt-1 line-clamp-2 leading-relaxed">
                Aliran renungan batin harian dan resonansi personal sinema.
              </p>
            </div>
          </Link>

          {/* Shortcut 2: Chronicle Vault */}
          <Link
            href="/journal/archive"
            data-testid="profile-shortcut-vault"
            className="card p-4 sm:p-5 bg-surface border border-line hover:border-lavender/50 hover:bg-surface-elevated transition-all duration-150 flex flex-col justify-between group min-h-[52px] active:scale-[0.98] cursor-pointer"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-lavender/15 text-lavender border border-lavender/30 flex items-center justify-center flex-none group-hover:scale-105 transition-transform shadow-xs">
                <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none stroke-[2]" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                  <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
                </svg>
              </div>
              <span className="text-[9px] font-pixel px-2 py-0.5 rounded bg-lavender/10 text-lavender uppercase tracking-wider">
                VAULT
              </span>
            </div>
            <div>
              <div className="flex items-center justify-between gap-1">
                <h3 className="font-serif font-bold text-sm sm:text-base text-text group-hover:text-lavender transition-colors">
                  Chronicle Vault
                </h3>
                <svg viewBox="0 0 16 16" className="w-4 h-4 fill-muted group-hover:text-lavender group-hover:translate-x-0.5 transition-all flex-none" aria-hidden="true">
                  <path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06z" />
                </svg>
              </div>
              <p className="text-xs text-muted/80 mt-1 line-clamp-2 leading-relaxed">
                Eksplorasi arsip kronologis & indeks linimasa rekaman jurnal.
              </p>
            </div>
          </Link>

          {/* Shortcut 3: Personal Notes */}
          <Link
            href="/notes"
            data-testid="profile-shortcut-notes"
            className="card p-4 sm:p-5 bg-surface border border-line hover:border-amber/50 hover:bg-surface-elevated transition-all duration-150 flex flex-col justify-between group min-h-[52px] active:scale-[0.98] cursor-pointer"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber/15 text-amber border border-amber/30 flex items-center justify-center flex-none group-hover:scale-105 transition-transform shadow-xs">
                <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none stroke-[2]" aria-hidden="true">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <span className="text-[9px] font-pixel px-2 py-0.5 rounded bg-amber/10 text-amber uppercase tracking-wider">
                MEMO
              </span>
            </div>
            <div>
              <div className="flex items-center justify-between gap-1">
                <h3 className="font-serif font-bold text-sm sm:text-base text-text group-hover:text-amber transition-colors">
                  Personal Notes
                </h3>
                <svg viewBox="0 0 16 16" className="w-4 h-4 fill-muted group-hover:text-amber group-hover:translate-x-0.5 transition-all flex-none" aria-hidden="true">
                  <path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06z" />
                </svg>
              </div>
              <p className="text-xs text-muted/80 mt-1 line-clamp-2 leading-relaxed">
                Papan memo scratchpad untuk kutipan dialog dan inspirasi spontan.
              </p>
            </div>
          </Link>
        </div>
      </section>

      <FilmStripDivider />

      {/* ─────────────────────────────────────────────────────────────
          SECTION C: APPEARANCE (Dark / Light Mode Theme Toggle)
         ───────────────────────────────────────────────────────────── */}
      <section className="card p-5 sm:p-6 bg-surface border border-line space-y-4">
        <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-neon-magenta" />
              <h2 className="font-serif font-bold text-lg sm:text-xl text-text">
                Tema Tampilan Bioskop
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-muted leading-relaxed max-w-xl">
              Beralih antara nuansa Dark Mode (Retro VHS Cinema) dan Light Mode yang sejuk. Preferensi tersimpan otomatis pada browser lu.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto p-2 rounded-xl bg-surface-elevated border border-line">
            <span className="text-xs font-pixel text-muted uppercase">Ganti Tema:</span>
            <ThemeToggle />
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION C.2: PWA INSTALLATION EXPERIENCE (Contextual & Non-intrusive)
         ───────────────────────────────────────────────────────────── */}
      <section className="card p-5 sm:p-6 bg-surface border border-line space-y-4">
        <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary-bright" />
              <h2 className="font-serif font-bold text-lg sm:text-xl text-text">
                Aplikasi Web Progresif (PWA)
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-muted leading-relaxed max-w-xl">
              Pasang Movie Cabin langsung ke layar utama ponsel atau desktop tanpa perlu mengunduh file APK.
            </p>
          </div>

          <div className="self-start sm:self-auto flex items-center gap-2">
            {isStandalone ? (
              <span className="badge badge-watched px-3 py-1.5 rounded-lg text-xs font-pixel uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-ok" />
                <span>TERPASANG SEBAGAI APP</span>
              </span>
            ) : canInstall || isIos ? (
              <button
                type="button"
                onClick={handleInstallClick}
                className="btn primary text-xs py-2 px-4 rounded-lg font-pixel tracking-wide flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
                  <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                </svg>
                <span>Pasang ke Layar Utama</span>
              </button>
            ) : (
              <span className="text-xs text-muted font-pixel uppercase px-2.5 py-1 rounded bg-surface-elevated border border-line">
                PWA SIAP DIPASANG
              </span>
            )}
          </div>
        </div>

        {/* iOS Safari Guided Steps */}
        {showIosGuide && !isStandalone && (
          <div className="p-4 rounded-xl bg-surface-elevated border border-line/80 space-y-2 text-xs text-text-subtle animate-in fade-in duration-200">
            <div className="font-pixel text-[11px] text-lavender uppercase flex items-center gap-1.5">
              <span>Panduan Pasang iOS Safari:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-muted text-xs leading-relaxed">
              <li>Ketuk ikon <strong>Bagikan (Share)</strong> di bilah bawah browser Safari.</li>
              <li>Gulir menu ke bawah dan pilih opsi <strong>Tambah ke Layar Utama (Add to Home Screen)</strong>.</li>
              <li>Ketuk <strong>Tambah</strong> di pojok kanan atas untuk menyelesaikan pemasangan.</li>
            </ol>
          </div>
        )}
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION D: ABOUT MOCAB
         ───────────────────────────────────────────────────────────── */}
      <section className="card p-5 sm:p-7 bg-surface border border-line space-y-4 relative overflow-hidden">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <Image
              src="/brand/logo-horizontal.webp"
              alt="MOCAB Movie Cabin Logo"
              width={130}
              height={32}
              className="h-7 sm:h-8 w-auto object-contain"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="movie" size="xs">
              RETRO VHS CINEMA
            </Badge>
            <Badge variant="watched" size="xs">
              BERUANG SASTRA
            </Badge>
          </div>
        </div>

        <div className="space-y-2 text-xs sm:text-sm text-muted leading-relaxed pt-1">
          <p>
            <strong className="text-text">Movie Cabin (MOCAB)</strong> adalah perpustakaan film pribadi dan rekan riset sinematik yang dikembangkan untuk kurasi karya Beruang Sastra.
          </p>
          <p>
            Memadukan 70% Modern Cinematic UI, 20% Retro VHS Identity, dan 10% Pixel Art Decoration untuk mempermudah pencatatan adegan berkesan, tema emosional, serta potensi konten esai film.
          </p>
        </div>

        <div className="pt-3 border-t border-line/60 flex items-center justify-between text-[11px] font-pixel text-muted/70 flex-wrap gap-2">
          <span>SP 120 MIN // STEREO HI-FI</span>
          <span>CURATED FOR WRITERS & FILMMAKERS</span>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          SECTION E: ACCOUNT ACTIONS (Logout)
         ───────────────────────────────────────────────────────────── */}
      <section className="pt-2">
        <div className="card p-5 bg-surface border border-danger/30 flex items-center justify-between gap-4 flex-col sm:flex-row">
          <div className="space-y-0.5">
            <h3 className="font-serif font-bold text-base text-text">
              Keluar dari Movie Cabin
            </h3>
            <p className="text-xs text-muted">
              Akhiri sesi akun saat ini pada perangkat ini.
            </p>
          </div>

          <form action={signOutAction} className="w-full sm:w-auto">
            <button
              type="submit"
              className="btn danger w-full sm:w-auto text-xs sm:text-sm py-2.5 px-5 font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              title="Keluar dari akun Supabase"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-4 h-4 stroke-current fill-none stroke-[2]"
                aria-hidden="true"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Keluar dari Akun</span>
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
