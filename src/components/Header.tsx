'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOutAction } from '@/app/auth/actions';

export function Header() {
  const pathname = usePathname();

  if (pathname === '/login') {
    return null;
  }

  const isHome = pathname === '/';
  const isBank = pathname.startsWith('/bank') && !pathname.includes('/catat');
  const isAdd = pathname === '/add';
  const isArchive = pathname === '/archive';

  const navLinks = [
    { href: '/', label: 'Home', active: isHome },
    { href: '/bank', label: 'Movie Bank', active: isBank },
    { href: '/add', label: 'Tambah Film', active: isAdd },
    { href: '/archive', label: 'Arsip Creator', active: isArchive },
  ];

  return (
    <header className="border-b border-line/60 bg-[#121017]/90 backdrop-blur-md sticky top-0 z-30 transition-colors">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand identity */}
        <Link
          href="/"
          className="group flex items-baseline gap-2.5 text-decoration-none focus-visible:outline-2 focus-visible:outline-accent rounded-md py-1"
        >
          <span className="font-serif font-bold text-xl tracking-tight text-text group-hover:text-accent transition-colors">
            MOCAB
          </span>
          <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-muted/40" />
          <span className="hidden sm:inline-block text-xs font-sans tracking-wide text-muted group-hover:text-text-subtle transition-colors">
            Movie Cabin <span className="text-[11px] text-muted/60">by Beruang Sastra</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav aria-label="Navigasi desktop" className="hidden md:flex items-center gap-1.5">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3.5 py-1.5 rounded-lg text-sm transition-all ${
                link.active
                  ? 'bg-surface-elevated text-text font-medium border border-line-subtle shadow-xs'
                  : 'text-muted hover:text-text hover:bg-surface/60'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* User / Sign Out */}
        <div className="flex items-center gap-2">
          <form action={signOutAction}>
            <button
              type="submit"
              title="Keluar dari akun"
              className="px-3 py-1.5 rounded-lg border border-line/80 bg-surface/60 text-xs font-medium text-muted hover:text-danger hover:border-danger/40 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-accent flex items-center gap-1.5"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-3.5 h-3.5 stroke-current fill-none stroke-[2]"
                aria-hidden="true"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Keluar</span>
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
