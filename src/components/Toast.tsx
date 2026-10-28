'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

interface ToastContextValue {
  showToast: (message: string, isError?: boolean) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ message: string; isError: boolean; visible: boolean }>({
    message: '',
    isError: false,
    visible: false,
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((message: string, isError = false) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setToast({
      message,
      isError,
      visible: true,
    });

    timerRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 2800);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-xl border bg-surface-elevated/95 backdrop-blur-md font-medium text-xs sm:text-sm transition-all duration-300 ease-out pointer-events-none shadow-xl ${
          toast.visible
            ? 'translate-y-0 opacity-100 scale-100'
            : '-translate-y-4 opacity-0 scale-95'
        } ${
          toast.isError
            ? 'border-danger/40 text-danger shadow-danger/10'
            : 'border-line-subtle text-text shadow-black/40'
        }`}
      >
        <div className="flex items-center gap-2">
          {toast.isError ? (
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current flex-none" aria-hidden="true">
              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0-1A6 6 0 1 0 8 2a6 6 0 0 0 0 12zM7 4h2v5H7V4zm0 6h2v2H7v-2z" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-accent flex-none" aria-hidden="true">
              <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
            </svg>
          )}
          <span>{toast.message}</span>
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
