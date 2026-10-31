'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function BottomNav() {
  const pathname = usePathname();

  // Jangan tampilkan navigasi bawah pada halaman login
  if (pathname === '/login') {
    return null;
  }

  const isHome = pathname === '/';
  const isBank = pathname.startsWith('/bank') && !pathname.includes('/catat');
  const isAdd = pathname === '/add';
  const isArchive = pathname === '/archive';
  const isProfile = pathname.startsWith('/profile');

  return (
    <nav
      aria-label="Navigasi mobile"
      className="md:hidden fixed left-0 right-0 bottom-0 bg-surface/95 backdrop-blur-lg border-t border-line/80 z-30 transition-colors"
    >
      <div className="max-w-md mx-auto grid grid-cols-5 items-center px-1.5 sm:px-3 pt-1.5 pb-[calc(8px+env(safe-area-inset-bottom))]">
        {/* 1. Home */}
        <Link
          href="/"
          className={`min-h-[44px] flex flex-col items-center justify-center gap-1 text-[10px] sm:text-[11px] py-1 rounded-lg transition-colors ${
            isHome ? 'text-neon-magenta font-semibold' : 'text-muted hover:text-text'
          }`}
          aria-label="Beranda"
        >
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5 stroke-current fill-none stroke-[2]"
            aria-hidden="true"
          >
            <path d="M3 11l9-7 9 7v9H3z" />
          </svg>
          <span className="truncate">Home</span>
        </Link>

        {/* 2. Bank */}
        <Link
          href="/bank"
          className={`min-h-[44px] flex flex-col items-center justify-center gap-1 text-[10px] sm:text-[11px] py-1 rounded-lg transition-colors ${
            isBank ? 'text-neon-magenta font-semibold' : 'text-muted hover:text-text'
          }`}
          aria-label="Movie Bank"
        >
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5 stroke-current fill-none stroke-[2]"
            aria-hidden="true"
          >
            <rect x="3" y="4" width="7" height="16" rx="1" />
            <rect x="14" y="4" width="7" height="16" rx="1" />
          </svg>
          <span className="truncate">Bank</span>
        </Link>

        {/* 3. Add Movie (Center Floating Action Button) */}
        <div className="flex items-center justify-center">
          <Link
            href="/add"
            aria-label="Tambah film baru ke koleksi"
            className={`w-[48px] h-[48px] rounded-full flex items-center justify-center -mt-5 bg-gradient-to-tr from-primary to-neon-magenta text-white shadow-lg shadow-primary/30 transition-all active:scale-95 focus-visible:outline-2 focus-visible:outline-neon-magenta ${
              isAdd ? 'ring-2 ring-neon-magenta ring-offset-2 ring-offset-bg scale-105' : 'hover:scale-105'
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5 stroke-current fill-none stroke-[2.5]"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </Link>
        </div>

        {/* 4. Archive */}
        <Link
          href="/archive"
          className={`min-h-[44px] flex flex-col items-center justify-center gap-1 text-[10px] sm:text-[11px] py-1 rounded-lg transition-colors ${
            isArchive ? 'text-neon-magenta font-semibold' : 'text-muted hover:text-text'
          }`}
          aria-label="Arsip Creator"
        >
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5 stroke-current fill-none stroke-[2]"
            aria-hidden="true"
          >
            <path d="M5 4h14v16l-7-4-7 4z" />
          </svg>
          <span className="truncate">Archive</span>
        </Link>

        {/* 5. Profil */}
        <Link
          href="/profile"
          className={`min-h-[44px] flex flex-col items-center justify-center gap-1 text-[10px] sm:text-[11px] py-1 rounded-lg transition-colors ${
            isProfile ? 'text-neon-magenta font-semibold' : 'text-muted hover:text-text'
          }`}
          aria-label="Profil Pengguna"
        >
          <svg
            viewBox="0 0 24 24"
            className="w-5 h-5 stroke-current fill-none stroke-[2]"
            aria-hidden="true"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span className="truncate">Profil</span>
        </Link>
      </div>
    </nav>
  );
}
