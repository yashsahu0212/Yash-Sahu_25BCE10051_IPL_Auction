/**
 * HAMMER — High-Performance Offline & PWA Service Worker
 * Ensures instant load times for static assets and resilience during event hall network drops.
 * NOTE: Live auction API endpoints and WebSockets are strictly bypassed (Network Only).
 */

const CACHE_NAME = 'hammer-shell-v1';

const STATIC_SHELL = [
  '/',
  '/index.html',
  '/mobile.html',
  '/player-pool.html',
  '/favicon.svg',
  '/manifest.json',
  '/css/hammer-editorial.css',
  '/js/hammer.js',
  '/js/hammer-ux.js',
  '/js/team-themes.js',
  '/js/player-images.js',
  '/js/supabase-config.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_SHELL).catch((err) => {
        console.warn('[SW] Some shell assets could not be pre-cached:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1. NEVER cache dynamic auction API, sockets, auth, or Supabase RPCs
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/socket.io/') ||
    url.hostname.includes('supabase.co') ||
    req.method !== 'GET'
  ) {
    return; // Pass through to network
  }

  // 2. Cache-first strategy for media, player portraits, and team logos
  if (
    url.pathname.startsWith('/players/') ||
    url.pathname.startsWith('/teams/') ||
    url.pathname.startsWith('/screens/') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('cdn.tailwindcss.com') ||
    url.hostname.includes('cdn.jsdelivr.net')
  ) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return res;
        }).catch(() => caches.match('/favicon.svg'));
      })
    );
    return;
  }

  // 3. Stale-While-Revalidate for local JS, CSS, SVG
  if (
    url.origin === self.location.origin &&
    (url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.svg'))
  ) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetchPromise = fetch(req).then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return networkRes;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // 4. Network-first with Cache fallback for HTML navigations
  if (req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(req).then((networkRes) => {
        if (networkRes && networkRes.status === 200) {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return networkRes;
      }).catch(() => caches.match(req).then((cached) => cached || caches.match('/index.html')))
    );
  }
});

