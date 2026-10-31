'use client';

import React from 'react';
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

export function ProfileView({ userEmail, movies, moods }: ProfileViewProps) {
  const totalMovies = movies.length;
  const watchedCount = movies.filter((m) => m.done).length;
  const unwatchedCount = totalMovies - watchedCount;
  const totalMoods = moods.length;

  const watchedPercent = totalMovies > 0 ? Math.round((watchedCount / totalMovies) * 100) : 0;

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
