import React from 'react';

interface PosterCoverProps {
  title: string;
  identifier?: string | number | null;
  done?: boolean;
  big?: boolean;
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
  return 180;
}

export function PosterCover({
  title,
  identifier = 1,
  done = false,
  big = false,
  className = '',
}: PosterCoverProps) {
  const h = calculateHue(identifier);
  const h2 = (h + 45) % 360;

  return (
    <div
      className={`relative aspect-[2/3] rounded-[10px] overflow-hidden flex items-end p-3 border border-line select-none ${className}`}
      style={{
        background: `linear-gradient(165deg, hsl(${h} 38% 34%), hsl(${h2} 42% 13%))`,
      }}
      aria-label={`Poster sampul untuk ${title}`}
    >
      <span
        className={`font-serif font-bold leading-[1.12] text-[#F4EEFB] [text-wrap:balance] ${
          big ? 'text-[28px]' : 'text-[19px]'
        }`}
      >
        {title}
      </span>
      {done && !big && (
        <span className="absolute top-2 right-2 bg-[#15111F]/85 rounded-lg px-[9px] py-[2px] text-xs font-medium text-ok">
          Sudah
        </span>
      )}
    </div>
  );
}
