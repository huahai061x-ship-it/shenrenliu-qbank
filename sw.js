const BUILD_VERSION = 'v2.2-pages-20260913-r1';
const CACHE_PREFIX = 'shenrenliu-qbank-';
const CACHE = `${CACHE_PREFIX}${BUILD_VERSION}`;
const CORE = [
  './', './index.html', './①点我打开题库.html', './styles.css',
  './questions.js', './pedagogy.js', './enhanced-fill.js', './app.js',
  './manifest.webmanifest', './icon-192.png', './icon-512.png',
  ...Array.from({length:111},(_,i)=>`./image${i+1}.webp`)
];

async function fetchFresh(request) {
  const response = await fetch(request, {cache: 'no-store'});
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${request.url || request}`);
  return response;
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(CORE.map(async url => {
      const request = new Request(url, {cache: 'reload'});
      await cache.put(request, await fetchFresh(request));
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetchFresh(request);
        const cache = await caches.open(CACHE);
        await cache.put(request, response.clone());
        return response;
      } catch (_) {
        return (await caches.match(request)) || (await caches.match('./index.html'));
      }
    })());
    return;
  }

  if (/\/image\d+\.webp$/.test(url.pathname) || /\/icon-(192|512)\.png$/.test(url.pathname)) {
    event.respondWith(caches.match(request).then(cached => cached || fetchFresh(request).then(async response => {
      const cache = await caches.open(CACHE);
      await cache.put(request, response.clone());
      return response;
    })));
    return;
  }

  event.respondWith((async () => {
    try {
      const response = await fetchFresh(request);
      const cache = await caches.open(CACHE);
      await cache.put(request, response.clone());
      return response;
    } catch (_) {
      return (await caches.match(request)) || Response.error();
    }
  })());
});
