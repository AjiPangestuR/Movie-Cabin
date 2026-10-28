'use client';

import React, { useState } from 'react';
import Image from 'next/image';

interface PosterCoverProps {
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
  return 220;
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
  // Melacak prop posterUrl saat ini dan me-reset status error jika berganti
  const [prevPosterUrl, setPrevPosterUrl] = useState<string | null | undefined>(posterUrl);
  const [imageFailed, setImageFailed] = useState(false);

  if (prevPosterUrl !== posterUrl) {
    setPrevPosterUrl(posterUrl);
    setImageFailed(false);
  }

  const showImage = Boolean(posterUrl && !imageFailed);

  const h = calculateHue(identifier);
  const h2 = (h + 38) % 360;

  return (
    <div
      className={`relative aspect-[2/3] rounded-lg overflow-hidden flex flex-col justify-between p-3.5 border border-white/[0.08] select-none shadow-md shadow-black/30 group/cover transition-all duration-300 bg-[#121017] ${className}`}
      style={
        !showImage
          ? {
              background: `radial-gradient(120% 120% at 50% 20%, hsl(${h} 32% 28%) 0%, hsl(${h2} 36% 10%) 100%)`,
            }
          : undefined
      }
      aria-label={`Poster sampul untuk ${title}`}
    >
      {/* Real Poster Image dari TMDB (unoptimized langsung dimuat browser dari CDN TMDB) */}
      {showImage && (
        <Image
          src={posterUrl!}
          alt={`Poster film ${title}`}
          fill
          unoptimized
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          onError={() => setImageFailed(true)}
          className="object-cover object-center pointer-events-none transition-transform duration-300 group-hover:scale-105 z-0"
        />
      )}

      {/* Editorial top header / seal */}
      <div className="flex items-center justify-between w-full z-10">
        <span className="text-[10px] uppercase tracking-widest font-mono text-white/70 bg-black/50 backdrop-blur-xs px-1.5 py-0.5 rounded select-none">
          MOCAB
        </span>

        {done && !big && (
          <span className="inline-flex items-center gap-1 bg-black/70 backdrop-blur-xs border border-ok/40 rounded-full px-2 py-0.5 text-[10px] font-medium text-ok tracking-wide">
            <svg viewBox="0 0 16 16" className="w-2.5 h-2.5 fill-current" aria-hidden="true">
              <path d="M13.854 3.646a.5.5 0 0 1 .708 0l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
            </svg>
            <span>Sudah</span>
          </span>
        )}
      </div>

      {/* Subtle vignette overlay: lembut saat gambar poster asli ada agar artwork tidak tertutup */}
      <div
        className={`absolute inset-0 pointer-events-none z-[1] ${
          showImage
            ? 'bg-gradient-to-t from-black/60 via-transparent to-transparent'
            : 'bg-gradient-to-t from-black/85 via-black/25 to-transparent'
        }`}
      />

      {/* Fine inner border for editorial print feel */}
      <div className="absolute inset-1.5 rounded-md border border-white/[0.05] pointer-events-none z-[1]" />

      {/* Typography: Tampil sebagai poster tipografi generatif jika TIDAK ada poster gambar TMDB */}
      {!showImage && (
        <div className="z-10 mt-auto">
          {year && (
            <div className="text-[11px] font-mono text-white/70 mb-1 tracking-wider drop-shadow-sm">
              {year}
            </div>
          )}
          <span
            className={`font-serif font-bold text-[#F8F5FC] block leading-[1.14] [text-wrap:balance] tracking-tight drop-shadow-md ${
              big ? 'text-2xl sm:text-3xl' : 'text-base sm:text-lg'
            }`}
          >
            {title}
          </span>
        </div>
      )}
    </div>
  );
}
