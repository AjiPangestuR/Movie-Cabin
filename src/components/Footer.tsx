'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

export function Footer() {
  const pathname = usePathname();

  if (pathname === '/login') {
    return null;
  }

  return (
    <footer className="border-t border-line/60 bg-surface/40 mt-auto transition-colors">
      {/* Subtle Analog Film Strip Perforation Bar */}
      <div
        className="w-full h-2.5 bg-surface-elevated/60 border-b border-line/40 flex items-center justify-around overflow-hidden select-none"
        aria-hidden="true"
      >
        <div className="w-full h-full opacity-35 bg-[repeating-linear-gradient(90deg,var(--line)_0px,var(--line)_6px,transparent_6px,transparent_18px)]" />
      </div>

      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 sm:gap-8">
          {/* Brand & Editorial Persona */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-3 max-w-sm">
            <div className="flex items-center gap-2.5">
              <Link href="/" className="inline-block" aria-label="Beranda MOCAB">
                <Image
                  src="/brand/logo-horizontal.webp"
                  alt="MOCAB Movie Cabin"
                  width={130}
                  height={32}
                  className="h-7 w-auto object-contain"
                />
              </Link>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-line bg-surface-elevated/70">
                <div className="w-5 h-5 flex items-center justify-center p-0.5 aspect-square flex-none">
                  <Image
                    src="/brand/avatar-paw.webp"
                    alt=""
                    width={18}
                    height={18}
                    className="w-full h-full object-contain"
                    aria-hidden="true"
                  />
                </div>
                <span className="font-pixel text-[9px] text-lavender tracking-wider uppercase">
                  BERUANG SASTRA
                </span>
              </div>
            </div>

            <p className="text-muted text-xs leading-relaxed">
              Arsip sinema pribadi dan sahabat riset film milik Beruang Sastra. Mengkurasi tontonan berkesan, membedah tema visual, dan memetakan potensi video essay.
            </p>
          </div>

          {/* Navigasi Cepat & Technical OSD */}
          <div className="flex flex-col items-center md:items-end text-center md:text-right space-y-3">
            {/* Quick Links */}
            <nav aria-label="Navigasi footer" className="flex items-center gap-4 text-xs font-medium text-muted flex-wrap justify-center">
              <Link href="/" className="hover:text-primary-bright transition-colors">
                Home
              </Link>
              <span className="text-line select-none">/</span>
              <Link href="/bank" className="hover:text-primary-bright transition-colors">
                Movie Bank
              </Link>
              <span className="text-line select-none">/</span>
              <Link href="/archive" className="hover:text-primary-bright transition-colors">
                Archive
              </Link>
              <span className="text-line select-none">/</span>
              <Link href="/add" className="hover:text-primary-bright transition-colors">
                Tambah Film
              </Link>
            </nav>

            {/* Retro VHS OSD Status Ledger */}
            <div className="flex items-center gap-2 text-[10px] font-pixel text-muted/70 flex-wrap justify-center md:justify-end">
              <span className="inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-neon-magenta" aria-hidden="true" />
                <span>HI-FI STEREO</span>
              </span>
              <span>·</span>
              <span>SP 120 MIN</span>
              <span>·</span>
              <span>CH 03</span>
              <span>·</span>
              <span>MOCAB TAPE ARCHIVE</span>
            </div>

            {/* Attribution note */}
            <p className="text-[11px] text-muted/60 font-sans">
              Data metadata dan poster film ditenagai oleh{' '}
              <a
                href="https://www.themoviedb.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-subtle hover:text-primary-bright transition-colors"
              >
                TMDB API
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
