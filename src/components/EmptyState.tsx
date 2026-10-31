import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface EmptyStateProps {
  title: string;
  description?: string;
  actionText?: string;
  actionHref?: string;
  onAction?: () => void;
  primaryAction?: boolean;
  className?: string;
}

export function EmptyState({
  title,
  description,
  actionText,
  actionHref,
  onAction,
  primaryAction = false,
  className = '',
}: EmptyStateProps) {
  const buttonClasses = `inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border font-medium text-sm transition-all duration-200 cursor-pointer focus-visible:outline-2 focus-visible:outline-primary active:scale-95 ${
    primaryAction
      ? 'bg-gradient-to-r from-primary to-neon-magenta border-transparent text-white font-semibold shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/35 hover:opacity-95'
      : 'bg-surface border-line text-text hover:border-primary/40 hover:bg-surface-elevated'
  }`;

  return (
    <div
      className={`my-8 px-6 py-12 border border-dashed border-line/80 rounded-2xl text-center bg-surface/40 max-w-lg mx-auto transition-colors ${className}`}
    >
      <div className="relative w-14 h-14 mx-auto mb-3.5 flex items-center justify-center">
        <div className="w-12 h-12 rounded-xl bg-surface-elevated flex items-center justify-center text-primary-bright border border-line shadow-xs">
          <svg viewBox="0 0 24 24" className="w-6 h-6 stroke-current fill-none stroke-[1.8]" aria-hidden="true">
            <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
            <line x1="7" y1="2" x2="7" y2="22" />
            <line x1="17" y1="2" x2="17" y2="22" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <line x1="2" y1="7" x2="7" y2="7" />
            <line x1="2" y1="17" x2="7" y2="17" />
            <line x1="17" y1="17" x2="22" y2="17" />
            <line x1="17" y1="7" x2="22" y2="7" />
          </svg>
        </div>

        {/* Beruang Sastra Paw Identity Stamp (Preserves 1:1 ratio with object-contain & padding) */}
        <div
          className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-lg bg-surface border border-line flex items-center justify-center p-1 shadow-xs aspect-square flex-none"
          aria-hidden="true"
        >
          <Image
            src="/brand/avatar-paw.webp"
            alt=""
            width={18}
            height={18}
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      <h3 className="font-serif font-bold text-xl text-text mb-2 tracking-tight">
        {title}
      </h3>

      {description && (
        <p className="text-muted text-sm max-w-sm mx-auto mb-5 leading-relaxed">
          {description}
        </p>
      )}

      {actionText && actionHref && (
        <Link href={actionHref} className={buttonClasses}>
          {actionText}
        </Link>
      )}

      {actionText && onAction && !actionHref && (
        <button type="button" onClick={onAction} className={buttonClasses}>
          {actionText}
        </button>
      )}
    </div>
  );
}
