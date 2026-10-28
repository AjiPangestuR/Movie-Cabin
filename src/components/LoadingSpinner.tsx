import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  className?: string;
}

export function LoadingSpinner({
  message = 'Memuat arsip film...',
  className = '',
}: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center p-12 text-center ${className}`}
    >
      <div className="relative w-9 h-9">
        <div className="absolute inset-0 rounded-full border border-line" />
        <div className="absolute inset-0 rounded-full border border-accent border-t-transparent animate-spin" />
      </div>
      <p className="text-muted text-xs sm:text-sm mt-4 font-mono tracking-wide">{message}</p>
    </div>
  );
}
