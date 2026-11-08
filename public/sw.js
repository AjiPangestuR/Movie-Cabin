/* MOCAB Progressive Web App - Service Worker */
/* Version: mocab-pwa-v2 */

const CACHE_NAME = 'mocab-static-v2';

const STATIC_PRECACHE = [
  '/offline',
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-512-maskable.png',
  '/icons/apple-touch-icon.png',
  '/brand/logo-horizontal.webp',
  '/brand/avatar-paw.webp',
  '/manifest.webmanifest',
];

// Install Event: precache essential static assets & offline fallback
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate Event: clean up legacy caches and take control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch Event: strictly handle security, API isolation, and offline fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle HTTP/HTTPS GET requests
  if (request.method !== 'GET' || !request.url.startsWith('http')) {
    return;
  }

  const url = new URL(request.url);

  // 1. SECURITY RESTRICTION: NEVER cache Supabase or private API calls
  // Supabase RPC, auth endpoints, and TMDB proxy routes MUST be Network-Only
  if (
    url.hostname.includes('supabase.co') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/')
  ) {
    // Pass directly to network with no cache intervention
    event.respondWith(fetch(request));
    return;
  }

  // 2. NAVIGATION REQUESTS (HTML pages): Network-First with Offline Fallback
  // Dynamic user data is never stored in service worker cache.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedOffline = await cache.match('/offline');
        return (
          cachedOffline ||
          new Response(
            '<!DOCTYPE html><html><body><h1>Offline</h1><p>Movie Cabin offline mode</p></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          )
        );
      })
    );
    return;
  }

  // 3. STATIC IMMUTABLE ASSETS (_next/static, public/icons, public/brand)
  // Cache-First with Network Revalidation for speed and offline icon rendering
  const isStaticAsset =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/brand/') ||
    url.pathname === '/manifest.webmanifest' ||
    url.pathname === '/manifest.json' ||
    url.pathname === '/favicon.ico';

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached and fetch update in background
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(request, networkResponse);
                });
              }
            })
            .catch(() => {
              // Ignore background fetch errors in offline conditions
            });
          return cachedResponse;
        }

        // Not in cache, fetch from network and cache
        return fetch(request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return networkResponse;
        });
      })
    );
    return;
  }

  // Default: Network with graceful fallback
  event.respondWith(fetch(request));
});

// Message listener for skip waiting prompt
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
