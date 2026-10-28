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
    }, 2600);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className={`fixed top-4 left-1/2 z-50 px-[18px] py-[10px] rounded-xl border bg-surface text-text font-medium text-sm transition-transform duration-250 ease-out pointer-events-none shadow-lg ${
          toast.visible
            ? 'translate-x-[-50%] translate-y-0 opacity-100'
            : 'translate-x-[-50%] -translate-y-20 opacity-0'
        } ${toast.isError ? 'border-danger text-text' : 'border-line text-text'}`}
      >
        {toast.message}
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
