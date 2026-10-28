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
  const buttonClasses = `inline-flex items-center justify-center gap-2 px-[18px] py-[11px] rounded-xl border font-medium text-sm transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-accent ${
    primaryAction
      ? 'bg-accent border-accent text-[#15111F] font-bold hover:bg-accent/90'
      : 'bg-surface border-line text-text hover:border-accent/40'
  }`;

  return (
    <div
      className={`mt-6 px-5 py-7 border border-dashed border-line rounded-[14px] text-center ${className}`}
    >
      <p className="font-serif font-bold text-lg text-text mb-2">{title}</p>
      {description && <p className="text-muted text-sm mb-3.5">{description}</p>}
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
