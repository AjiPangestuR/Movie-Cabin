import React from 'react';
import Link from 'next/link';

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
  const buttonClasses = `inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border font-medium text-sm transition-all duration-150 cursor-pointer focus-visible:ring-2 focus-visible:ring-accent ${
    primaryAction
      ? 'bg-accent border-accent text-[#121017] font-semibold hover:bg-accent/90 shadow-sm shadow-accent/20'
      : 'bg-surface border-line text-text hover:border-accent/40 hover:bg-surface-elevated'
  }`;

  return (
    <div
      className={`my-8 px-6 py-12 border border-dashed border-line/80 rounded-xl text-center bg-surface/30 max-w-lg mx-auto ${className}`}
    >
      <div className="w-10 h-10 mx-auto mb-3.5 rounded-full bg-surface-elevated flex items-center justify-center text-muted/60 border border-line-subtle">
        <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none stroke-[1.6]" aria-hidden="true">
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

      <h3 className="font-serif font-medium text-xl text-text mb-2 tracking-tight">
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
