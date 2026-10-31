import React from 'react';

export type BadgeVariant =
  | 'movie'
  | 'review'
  | 'recommend'
  | 'analysis'
  | 'discussion'
  | 'watchlist'
  | 'watched';

export type BadgeSize = 'xs' | 'sm' | 'md';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children?: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, { container: string; defaultLabel: string }> = {
  movie: {
    container: 'bg-primary/15 text-primary-bright border-primary/30',
    defaultLabel: 'MOVIE',
  },
  review: {
    container: 'bg-neon-magenta/15 text-neon-magenta border-neon-magenta/35',
    defaultLabel: 'REVIEW',
  },
  recommend: {
    container: 'bg-amber/15 text-amber border-amber/35',
    defaultLabel: 'RECOMMEND',
  },
  analysis: {
    container: 'bg-sky-500/15 text-sky-400 border-sky-500/35',
    defaultLabel: 'ANALYSIS',
  },
  discussion: {
    container: 'bg-lavender/15 text-lavender border-lavender/35',
    defaultLabel: 'DISCUSSION',
  },
  watchlist: {
    container: 'bg-primary/15 text-primary-bright border-primary/30',
    defaultLabel: 'WATCHLIST',
  },
  watched: {
    container: 'bg-ok/15 text-ok border-ok/35',
    defaultLabel: 'WATCHED',
  },
};

const sizeStyles: Record<BadgeSize, string> = {
  xs: 'px-1.5 py-0.5 text-[9px]',
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-xs',
};

export function Badge({
  variant = 'movie',
  size = 'sm',
  children,
  className = '',
}: BadgeProps) {
  const config = variantStyles[variant] || variantStyles.movie;
  const sizeClass = sizeStyles[size] || sizeStyles.sm;

  return (
    <span
      className={`inline-flex items-center gap-1 font-pixel uppercase tracking-wide rounded-md border select-none transition-colors ${config.container} ${sizeClass} ${className}`}
    >
      <span className="w-1 h-1 rounded-full bg-current opacity-80" aria-hidden="true" />
      <span>{children ?? config.defaultLabel}</span>
    </span>
  );
}
