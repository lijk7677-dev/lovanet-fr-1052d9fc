// Ce fichier va gérer l'interception et la mise en cache (PWA Hors-ligne)
// Il est conçu pour être enregistré dans index.tsx

const CACHE_NAME = 'lovanet-offline-v2';

// Fichiers statiques vitaux à mettre en cache immédiatement
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/static/js/bundle.js',
  '/favicon.png',
  '/lovanet-icon-16.png',
  '/lovanet-icon-32.png',
  '/lovanet-icon-48.png',
  '/lovanet-icon-64.png',
  '/lovanet-icon-180.png',
  '/lovanet-icon-192.png',
  '/lovanet-icon-512.png',
  '/lovanet-logo-custom.png',
  '/lovanet-og.svg',
];

// eslint-disable-next-line no-restricted-globals
self.addEventListener('install', (event: any) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache');
      return cache.addAll(PRECACHE_URLS);
    })
  );
  // eslint-disable-next-line no-restricted-globals
  self.skipWaiting();
});

// eslint-disable-next-line no-restricted-globals
self.addEventListener('activate', (event: any) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      );
    })
  );
  // eslint-disable-next-line no-restricted-globals
  self.clients.claim();
});

// eslint-disable-next-line no-restricted-globals
self.addEventListener('fetch', (event: any) => {
  const url = new URL(event.request.url);

  // Exclude API requests from strict cache-first, but we can do network-first fallback to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone the response and cache it
          const resClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, resClone);
          });
          return response;
        })
        .catch(() => {
          // Offline fallback
          return caches.match(event.request);
        })
    );
    return;
  }

  // Assets (mp4, images) -> Cache first, then network
  if (url.pathname.match(/\.(mp4|jpg|png|svg|ico)$/)) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request).then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
          return res;
        });
      })
    );
    return;
  }

  // Default network first for HTML/JS
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});