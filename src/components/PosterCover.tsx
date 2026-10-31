'use client';

import React, { useState } from 'react';
import Image from 'next/image';

export interface PosterCoverProps {
  title: string;
  identifier?: string | number | null;
  done?: boolean;
  big?: boolean;
  year?: number | string | null;
  posterUrl?: string | null;
  className?: string;
}

function calculateHue(identifier?: string | number | null): number {
  if (typeof identifier === 'number' && !isNaN(identifier)) {
    return (identifier * 47) % 360;
  }
  if (typeof identifier === 'string' && identifier.length > 0) {
    let hash = 0;
    for (let i = 0; i < identifier.length; i++) {
      hash = (hash << 5) - hash + identifier.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % 360;
  }
  return 270; // MOCAB signature purple-magenta default hue
}

export function PosterCover({
  title,
  identifier = 1,
  done = false,
  big = false,
  year,
  posterUrl,
  className = '',
}: PosterCoverProps) {
  // Track current posterUrl and reset failed state on change
  const [prevPosterUrl, setPrevPosterUrl] = useState<string | null | undefined>(posterUrl);
  const [imageFailed, setImageFailed] = useState(false);

  if (prevPosterUrl !== posterUrl) {
    setPrevPosterUrl(posterUrl);
    setImageFailed(false);
  }

  const showImage = Boolean(posterUrl && !imageFailed);
  const h = calculateHue(identifier);
  const h2 = (h + 45) % 360;

  return (
    <div
      className={`relative aspect-[2/3] rounded-xl overflow-hidden flex flex-col justify-between p-3.5 border border-line select-none shadow-md shadow-black/25 group/cover transition-all duration-200 bg-surface-elevated hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 ${className}`}
      style={
        !showImage
          ? {
              background: `radial-gradient(125% 125% at 50% 15%, hsl(${h} 28% 22%) 0%, hsl(${h2} 32% 9%) 100%)`,
            }
          : undefined
      }
      aria-label={`Poster sampul untuk ${title}`}
    >
      {/* Real Poster Image from TMDB */}
      {showImage && (
        <Image
          src={posterUrl!}
          alt={`Poster film ${title}`}
          fill
          unoptimized
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          onError={() => setImageFailed(true)}
          className="object-cover object-center pointer-events-none transition-transform duration-300 group-hover/cover:scale-105 z-0"
        />
      )}

      {/* Top Editorial Bar: MOCAB Brand Tag & Status */}
      <div className="flex items-center justify-between w-full z-10">
        <span className="text-[9px] font-pixel text-lavender/95 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded border border-white/10 tracking-widest uppercase select-none">
          MOCAB
        </span>

        {done && !big && (
          <span className="inline-flex items-center gap-1 bg-black/70 backdrop-blur-md border border-ok/50 rounded px-1.5 py-0.5 text-[9px] font-pixel text-ok tracking-wide">
            <svg viewBox="0 0 16 16" className="w-2.5 h-2.5 fill-current" aria-hidden="true">
              <path d="M13.854 3.646a.5.5 0 0 1 .708 0l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
            </svg>
            <span>SUDAH</span>
          </span>
        )}
      </div>

      {/* Subtle Vignette Overlay for Real Poster */}
      <div
        className={`absolute inset-0 pointer-events-none z-[1] ${
          showImage
            ? 'bg-gradient-to-t from-black/75 via-transparent to-black/30'
            : 'bg-gradient-to-t from-black/85 via-black/20 to-transparent'
        }`}
      />

      {/* Fine inner border for vintage film print aesthetic */}
      <div className="absolute inset-1.5 rounded-lg border border-white/10 pointer-events-none z-[2]" />

      {/* Retro VHS Tape Watermark in Generative Fallback */}
      {!showImage && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[1] opacity-15">
          <svg viewBox="0 0 100 60" className="w-24 h-auto stroke-current fill-none text-lavender" strokeWidth="2.5">
            <rect x="5" y="5" width="90" height="50" rx="4" />
            <circle cx="32" cy="30" r="11" />
            <circle cx="68" cy="30" r="11" />
            <rect x="24" y="24" width="52" height="12" rx="2" />
          </svg>
        </div>
      )}

      {/* Generative Editorial Typography Fallback */}
      {!showImage && (
        <div className="z-10 mt-auto">
          {year && (
            <div className="text-[11px] font-pixel text-neon-magenta mb-1 tracking-wider drop-shadow-sm">
              {year}
            </div>
          )}
          <span
            className={`font-serif font-bold text-white block leading-[1.15] [text-wrap:balance] tracking-tight drop-shadow-md ${
              big ? 'text-2xl sm:text-3xl' : 'text-base sm:text-lg'
            }`}
          >
            {title}
          </span>
          <div className="mt-2 pt-1 border-t border-white/15 flex items-center justify-between text-[8px] font-pixel text-white/50">
            <span>NO POSTER</span>
            <span>VHS TAPE</span>
          </div>
        </div>
      )}
    </div>
  );
}
