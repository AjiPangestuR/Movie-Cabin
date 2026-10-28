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

  return (
    <nav
      aria-label="Navigasi mobile"
      className="md:hidden fixed left-0 right-0 bottom-0 bg-[#121017]/95 backdrop-blur-lg border-t border-line/80 z-30"
    >
      <div className="max-w-md mx-auto flex justify-around items-center px-4 pt-2 pb-[calc(10px+env(safe-area-inset-bottom))]">
        {/* Home */}
        <Link
          href="/"
          className={`flex flex-col items-center gap-1 text-[12px] px-3 py-1 rounded-lg transition-colors ${
            isHome ? 'text-accent font-medium' : 'text-muted hover:text-text'
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            className="w-[20px] h-[20px] stroke-current fill-none stroke-[1.8]"
            aria-hidden="true"
          >
            <path d="M3 11l9-7 9 7v9H3z" />
          </svg>
          <span>Home</span>
        </Link>

        {/* Bank */}
        <Link
          href="/bank"
          className={`flex flex-col items-center gap-1 text-[12px] px-3 py-1 rounded-lg transition-colors ${
            isBank ? 'text-accent font-medium' : 'text-muted hover:text-text'
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            className="w-[20px] h-[20px] stroke-current fill-none stroke-[1.8]"
            aria-hidden="true"
          >
            <rect x="3" y="4" width="7" height="16" rx="1" />
            <rect x="14" y="4" width="7" height="16" rx="1" />
          </svg>
          <span>Bank</span>
        </Link>

        {/* Add Button */}
        <Link
          href="/add"
          aria-label="Tambah film baru"
          className={`w-[46px] h-[46px] rounded-full flex items-center justify-center text-[24px] font-semibold -mt-[14px] bg-accent text-[#121017] shadow-md shadow-accent/20 transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-accent ${
            isAdd ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg' : ''
          }`}
        >
          +
        </Link>

        {/* Archive */}
        <Link
          href="/archive"
          className={`flex flex-col items-center gap-1 text-[12px] px-3 py-1 rounded-lg transition-colors ${
            isArchive ? 'text-accent font-medium' : 'text-muted hover:text-text'
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            className="w-[20px] h-[20px] stroke-current fill-none stroke-[1.8]"
            aria-hidden="true"
          >
            <path d="M5 4h14v16l-7-4-7 4z" />
          </svg>
          <span>Arsip</span>
        </Link>
      </div>
    </nav>
  );
}
