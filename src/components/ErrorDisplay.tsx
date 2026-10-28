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
      className={`border border-danger/40 bg-surface rounded-[14px] p-6 text-center my-6 ${className}`}
    >
      <p className="font-serif font-bold text-lg text-danger mb-1">{title}</p>
      <p className="text-muted text-sm mb-4">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="btn primary cursor-pointer"
        >
          Coba Lagi
        </button>
      )}
    </div>
  );
}
