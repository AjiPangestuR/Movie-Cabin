'use client';

import React, { useEffect } from 'react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled app error:', error);
  }, [error]);

  return (
    <div className="mt-12 text-center">
      <h1 className="text-3xl font-serif font-bold text-danger mb-2">Terjadi Kesalahan</h1>
      <p className="text-muted text-sm mb-6">{error.message || 'Terjadi kesalahan sistem.'}</p>
      <button
        type="button"
        onClick={() => reset()}
        className="btn primary cursor-pointer"
      >
        Coba Lagi
      </button>
    </div>
  );
}
