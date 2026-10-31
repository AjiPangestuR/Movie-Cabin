'use client';

import React from 'react';
import { useTheme } from './ThemeProvider';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme, isMounted } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Ganti mode tampilan (Gelap/Terang)"
      title={isMounted ? (theme === 'dark' ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap') : 'Ganti mode tema'}
      className={`p-2 rounded-lg border border-line/80 bg-surface/60 text-muted hover:text-text hover:border-line hover:bg-surface-elevated transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-accent flex items-center justify-center ${className}`}
    >
      <span className="sr-only">
        {isMounted ? (theme === 'dark' ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap') : 'Ganti mode tema'}
      </span>

      {/* Sun icon: active in dark mode to prompt switching to light */}
      <span className="theme-icon-sun" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          className="w-4 h-4 stroke-current fill-none stroke-[2]"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      </span>

      {/* Moon icon: active in light mode to prompt switching to dark */}
      <span className="theme-icon-moon" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          className="w-4 h-4 stroke-current fill-none stroke-[2]"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
      </span>
    </button>
  );
}
