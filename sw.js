const CACHE_NAME = 'stashRx-v22';
const ASSETS = [
  '/stashrx/',
  '/stashrx/index.html',
  '/stashrx/app.html',
  '/stashrx/chart.umd.min.js',
  '/stashrx/manifest.json',
  '/stashrx/icon-192.png',
  '/stashrx/icon-512.png',
  '/stashrx/favicon.ico'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(response => {
      return response || fetch(event.request);
    })
  );
});
