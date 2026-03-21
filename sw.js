// sw.js — Service Worker for ProBuilder PWA
const CACHE_NAME = 'probuilder-v1.1'; // Increment version to force update

// Files to cache for offline use
const PRECACHE_URLS = [
  './',
  './index.html',
  './tools.html',
  './about.html',
  './how-to.html',
  './contact.html',
  './offline.html',
  './stender.html',
  './lekter.html',
  './areal.html',
  './materialer.html',
  './trapp.html',
  './betong.html',
  './murverk.html',
  './normcalc.html',
  './work_norms.js',
  './js/i18n.js',
  './js/pwa.js',
  './css/style.css',
  './manifest.json',
  './img/icon-192.png',
  './img/icon-512.png',
  './img/og-image.png',
  './img/icon-192.svg',
  './img/icon-512.svg',
  './img/og-image.svg'
];

// 1. INSTALL: Cache essential files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Pre-caching core assets');
        // Use Promise.allSettled so that one missing file doesn't kill the whole process
        return Promise.allSettled(
          PRECACHE_URLS.map(url => {
            return cache.add(url).catch(err => console.warn(`[SW] Failed to cache: ${url}`, err));
          })
        );
      })
      .then(() => self.skipWaiting())
  );
});

// 2. ACTIVATE: Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. FETCH: Strategy "Network First, Falling Back to Cache" for HTML
// Strategy "Cache First, Falling Back to Network" for static assets
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  // Detect if it's a navigation request (HTML page)
  const isNavigation = event.request.mode === 'navigate';

  if (isNavigation) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Update cache with fresh version
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() => {
          // Offline? Try to get from cache
          return caches.match(event.request)
            .then(cachedResponse => {
              // If not in cache, show offline.html
              return cachedResponse || caches.match('./offline.html');
            });
        })
    );
  } else {
    // Static assets (CSS, JS, Images)
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) return cachedResponse;

        return fetch(event.request).then(response => {
          // Cache only valid responses
          if (response && response.status === 200 && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          }
          return response;
        }).catch(() => {
          // Silently fail for static assets
        });
      })
    );
  }
});

// 4. Update Logic
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
