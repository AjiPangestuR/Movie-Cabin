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
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border border-line" />
        <div className="absolute inset-0 rounded-full border-2 border-neon-magenta border-t-transparent animate-spin" />
      </div>
      <p className="text-muted text-xs mt-4 font-pixel tracking-wide">{message}</p>
    </div>
  );
}
