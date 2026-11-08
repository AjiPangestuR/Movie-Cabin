'use client';

import { useEffect } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Global declaration for deferred PWA install prompt
declare global {
  interface Window {
    __MOCAB_DEFERRED_PROMPT?: BeforeInstallPromptEvent;
  }
}

export function PwaRegister() {
  useEffect(() => {
    // 1. Register Service Worker in supporting browsers
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const handleLoad = () => {
        navigator.serviceWorker
          .register('/sw.js', { scope: '/' })
          .then((registration) => {
            // Check for service worker updates periodically
            registration.onupdatefound = () => {
              const installingWorker = registration.installing;
              if (installingWorker) {
                installingWorker.onstatechange = () => {
                  if (
                    installingWorker.state === 'installed' &&
                    navigator.serviceWorker.controller
                  ) {
                    // New content is available; notify listeners
                    window.dispatchEvent(new CustomEvent('mocab-pwa-update-available'));
                  }
                };
              }
            };
          })
          .catch((err) => {
            console.warn('[PWA] Service Worker registration failed:', err);
          });
      };

      if (document.readyState === 'complete') {
        handleLoad();
      } else {
        window.addEventListener('load', handleLoad);
        return () => window.removeEventListener('load', handleLoad);
      }
    }

    // 2. Capture BeforeInstallPromptEvent for contextual installation
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      window.__MOCAB_DEFERRED_PROMPT = e as BeforeInstallPromptEvent;
      window.dispatchEvent(new CustomEvent('mocab-pwa-installable'));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 3. Listen for app installed event
    const handleAppInstalled = () => {
      window.__MOCAB_DEFERRED_PROMPT = undefined;
      window.dispatchEvent(new CustomEvent('mocab-pwa-installed'));
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  return null;
}
