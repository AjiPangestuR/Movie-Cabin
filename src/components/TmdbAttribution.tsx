import React from 'react';

interface TmdbAttributionProps {
  className?: string;
}

/**
 * Komponen atribusi resmi TMDB sesuai panduan branding developer.themoviedb.org
 */
export function TmdbAttribution({ className = '' }: TmdbAttributionProps) {
  return (
    <div
      role="contentinfo"
      aria-label="Atribusi TMDB"
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-lg border border-line-subtle bg-surface/30 text-muted ${className}`}
    >
      <div className="flex items-center gap-2.5">
        {/* Logo resmi TMDB */}
        <svg
          viewBox="0 0 184 16"
          className="h-3.5 w-auto fill-current text-[#01b4e4]"
          aria-hidden="true"
        >
          <path d="M14.6 0H0v16h14.6V0zM38.8 0H21.4v16h8.2V5.8h9.2V0zM63.1 0H45.7v16h8.2v-4.7h9.2c3.9 0 7.1-3.2 7.1-7.1 0-4-3.2-4.2-7.1-4.2zm0 6.6h-9.2V4.7h9.2c1.3 0 2.4.9 2.4 2.1 0 1.2-1.1 2.2-2.4 2.2zM87.4 0H70v16h8.2V5.8h9.2V0zM111.7 0H94.3v16h17.4c4.6 0 8.3-3.7 8.3-8.3s-3.7-7.7-8.3-7.7zm0 10.2h-9.2V4.7h9.2c2.4 0 4.3 1.9 4.3 4.3s-1.9 3.6-4.3 3.6zM136 0h-8.2v16H136V0zM160.3 0h-17.4v16h17.4c4.6 0 8.3-3.7 8.3-8.3s-3.7-7.7-8.3-7.7zm0 10.2h-9.2V4.7h9.2c2.4 0 4.3 1.9 4.3 4.3s-1.9 3.6-4.3 3.6z" />
        </svg>
        <span className="text-[11px] font-mono tracking-wider uppercase text-muted/70">
          Metadata Partner
        </span>
      </div>

      <p className="text-[11px] text-muted/80 text-center sm:text-right leading-relaxed">
        This product uses the TMDB API but is not endorsed or certified by TMDB.
      </p>
    </div>
  );
}
