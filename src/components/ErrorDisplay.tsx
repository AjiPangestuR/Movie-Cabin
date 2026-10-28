import React from 'react';

interface ErrorDisplayProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorDisplay({
  title = 'Terjadi Kesalahan',
  message = 'Gagal memuat data dari database.',
  onRetry,
  className = '',
}: ErrorDisplayProps) {
  return (
    <div
      role="alert"
      className={`border border-danger/30 bg-surface/80 rounded-xl p-6 sm:p-8 text-center my-8 max-w-md mx-auto shadow-sm ${className}`}
    >
      <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-danger/10 border border-danger/25 flex items-center justify-center text-danger">
        <svg viewBox="0 0 24 24" className="w-5 h-5 stroke-current fill-none stroke-[2]" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>

      <h3 className="font-serif font-medium text-lg text-danger mb-1.5">{title}</h3>
      <p className="text-muted text-sm mb-5 leading-relaxed">{message}</p>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="btn primary cursor-pointer text-xs sm:text-sm px-4 py-2"
        >
          Coba Lagi
        </button>
      )}
    </div>
  );
}
