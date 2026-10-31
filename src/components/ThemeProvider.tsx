'use client';

import React, { createContext, useContext, useCallback, useSyncExternalStore } from 'react';

export type Theme = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'mocab_theme';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isMounted: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {},
  isMounted: false,
});

/**
 * Inline script executed synchronously in <head> before first paint.
 * Ensures data-theme and .light class are applied immediately based on
 * user's saved preference or prefers-color-scheme, eliminating FOUC / theme flash.
 */
export const themeInitScript = `(function(){try{var s=localStorage.getItem('${THEME_STORAGE_KEY}');var m=window.matchMedia('(prefers-color-scheme: light)').matches;var t=s==='light'||s==='dark'?s:(m?'light':'dark');var d=document.documentElement;d.setAttribute('data-theme',t);if(t==='light'){d.classList.add('light');}else{d.classList.remove('light');}}catch(e){}})();`;

const THEME_CHANGE_EVENT = 'mocab-theme-change';

function applyThemeToDom(targetTheme: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', targetTheme);
  if (targetTheme === 'light') {
    root.classList.add('light');
  } else {
    root.classList.remove('light');
  }
}

function getClientSnapshot(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

function getServerSnapshot(): Theme {
  return 'dark';
}

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handler = () => {
    applyThemeToDom(getClientSnapshot());
    callback();
  };

  window.addEventListener(THEME_CHANGE_EVENT, handler);
  window.addEventListener('storage', handler);

  const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
  mediaQuery.addEventListener('change', handler);

  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, handler);
    window.removeEventListener('storage', handler);
    mediaQuery.removeEventListener('change', handler);
  };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const setTheme = useCallback((nextTheme: Theme) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // Storage access might fail in strict private browsing
    }
    applyThemeToDom(nextTheme);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }, []);

  const toggleTheme = useCallback(() => {
    let currentTheme: Theme = theme;
    if (typeof document !== 'undefined') {
      const domTheme = document.documentElement.getAttribute('data-theme');
      if (domTheme === 'light' || domTheme === 'dark') {
        currentTheme = domTheme;
      }
    }
    const nextTheme: Theme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isMounted }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
