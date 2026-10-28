'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function BottomNav() {
  const pathname = usePathname();

  const isHome = pathname === '/';
  const isBank = pathname.startsWith('/bank');
  const isAdd = pathname === '/add';
  const isArchive = pathname === '/archive';

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed left-0 right-0 bottom-0 bg-[#15111F]/95 backdrop-blur-md border-t border-line z-30"
    >
      <div className="max-w-[880px] mx-auto flex justify-around items-center px-3 pt-2 pb-[calc(8px+env(safe-area-inset-bottom))]">
        {/* Home */}
        <Link
          href="/"
          className={`flex flex-col items-center gap-0.5 text-[13px] px-4 py-1.5 rounded-xl transition-colors ${
            isHome ? 'text-accent font-medium' : 'text-muted hover:text-text'
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            className="w-[22px] h-[22px] stroke-current fill-none stroke-[1.8]"
            aria-hidden="true"
          >
            <path d="M3 11l9-7 9 7v9H3z" />
          </svg>
          <span>Home</span>
        </Link>

        {/* Bank */}
        <Link
          href="/bank"
          className={`flex flex-col items-center gap-0.5 text-[13px] px-4 py-1.5 rounded-xl transition-colors ${
            isBank ? 'text-accent font-medium' : 'text-muted hover:text-text'
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            className="w-[22px] h-[22px] stroke-current fill-none stroke-[1.8]"
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
          aria-label="Tambah film"
          className={`w-[52px] h-[52px] rounded-full flex items-center justify-center text-[28px] font-medium -mt-[18px] bg-accent text-[#15111F] shadow-lg transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-accent ${
            isAdd ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg' : ''
          }`}
        >
          +
        </Link>

        {/* Archive */}
        <Link
          href="/archive"
          className={`flex flex-col items-center gap-0.5 text-[13px] px-4 py-1.5 rounded-xl transition-colors ${
            isArchive ? 'text-accent font-medium' : 'text-muted hover:text-text'
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            className="w-[22px] h-[22px] stroke-current fill-none stroke-[1.8]"
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
