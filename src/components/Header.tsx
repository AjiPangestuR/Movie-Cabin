'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { signOutAction } from '@/app/auth/actions';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SearchModal } from '@/components/SearchModal';

export function Header() {
  const pathname = usePathname();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Global keyboard shortcut: Ctrl+K / Cmd+K to open search modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (pathname === '/login') {
    return null;
  }

  const isHome = pathname === '/';
  const isBank = pathname.startsWith('/bank') && !pathname.includes('/catat');
  const isAdd = pathname === '/add';
  const isArchive = pathname === '/archive';

  // Primary navigation: Home, Movie Bank, Archive
  const navLinks = [
    { href: '/', label: 'Home', active: isHome },
    { href: '/bank', label: 'Movie Bank', active: isBank },
    { href: '/archive', label: 'Archive', active: isArchive },
  ];

  return (
    <>
      <header className="border-b border-line/60 bg-surface/90 backdrop-blur-md sticky top-0 z-30 transition-colors">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3 sm:gap-4">
          {/* Brand Identity with Retro VHS Horizontal Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-lg py-1 flex-none group focus-visible:outline-2 focus-visible:outline-primary"
            aria-label="Kembali ke Beranda Movie Cabin"
          >
            <Image
              src="/brand/logo-horizontal.webp"
              alt="MOCAB Movie Cabin"
              width={140}
              height={34}
              priority
              className="h-8 sm:h-9 w-auto object-contain transition-transform group-hover:scale-[1.02]"
            />
          </Link>

          {/* Desktop Navigation Links */}
          <nav aria-label="Navigasi desktop" className="hidden md:flex items-center gap-1.5">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                  link.active
                    ? 'bg-neon-magenta/15 text-neon-magenta font-semibold border border-neon-magenta/35 shadow-xs shadow-neon-magenta/10'
                    : 'text-muted hover:text-text hover:bg-surface/80 border border-transparent'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right Action Controls: Search, Quick Add, Theme, Logout */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Desktop Search Trigger */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              aria-label="Cari film di koleksi (Ctrl + K)"
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-line bg-surface/80 text-muted hover:text-text hover:border-primary/50 hover:bg-surface-elevated transition-colors cursor-pointer text-xs focus-visible:outline-2 focus-visible:outline-primary"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none stroke-[2]" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <span>Cari film...</span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-pixel rounded border border-line bg-surface-elevated text-muted">
                Ctrl K
              </kbd>
            </button>

            {/* Mobile Search Trigger */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              aria-label="Buka pencarian film"
              className="sm:hidden p-2 rounded-lg border border-line/80 bg-surface/60 text-muted hover:text-text hover:border-line hover:bg-surface-elevated transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-primary flex items-center justify-center"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current fill-none stroke-[2]" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </button>

            {/* Quick Add Action (Desktop) */}
            <Link
              href="/add"
              className={`hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-primary ${
                isAdd
                  ? 'bg-primary text-text shadow-sm'
                  : 'bg-primary/10 text-primary-bright hover:bg-primary/20 border border-primary/25'
              }`}
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current fill-none stroke-[2.5]" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span>Tambah Film</span>
            </Link>

            {/* Theme Toggle from Phase 2 */}
            <ThemeToggle />

            {/* Logout / Sign Out */}
            <form action={signOutAction}>
              <button
                type="submit"
                title="Keluar dari akun"
                aria-label="Keluar dari akun"
                className="px-2.5 sm:px-3 py-1.5 rounded-lg border border-line/80 bg-surface/60 text-xs font-medium text-muted hover:text-danger hover:border-danger/40 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-primary flex items-center gap-1.5"
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
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Global Search Modal */}
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
