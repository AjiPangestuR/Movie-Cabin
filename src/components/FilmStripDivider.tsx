import React from 'react';

interface FilmStripDividerProps {
  className?: string;
  label?: string;
}

export function FilmStripDivider({
  className = '',
  label = 'MOCAB 35MM',
}: FilmStripDividerProps) {
  return (
    <div
      className={`w-full py-3 flex items-center justify-center select-none overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <div className="w-full flex items-center gap-3 max-w-xl mx-auto">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-line to-line/80" />
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-line bg-surface-elevated/60 text-muted/60 shadow-xs">
          <span className="w-1.5 h-1.5 rounded-xs bg-primary/60" />
          <span className="w-1.5 h-1.5 rounded-xs bg-neon-magenta/60" />
          <span className="w-1.5 h-1.5 rounded-xs bg-lavender/60" />
          <span className="text-[9px] font-pixel text-muted/70 uppercase tracking-widest px-1">
            {label}
          </span>
          <span className="w-1.5 h-1.5 rounded-xs bg-lavender/60" />
          <span className="w-1.5 h-1.5 rounded-xs bg-neon-magenta/60" />
          <span className="w-1.5 h-1.5 rounded-xs bg-primary/60" />
        </div>
        <div className="flex-1 h-px bg-gradient-to-r from-line/80 via-line to-transparent" />
      </div>
    </div>
  );
}
