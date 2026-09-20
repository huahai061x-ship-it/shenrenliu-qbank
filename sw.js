const BUILD_VERSION = '__BUILD_VERSION__';
const CACHE_PREFIX = 'shenrenliu-qbank-app-';
const APP_CACHE = `${CACHE_PREFIX}${BUILD_VERSION}`;
const IMAGE_CACHE = 'shenrenliu-qbank-images-v1';
const REQUIRED = [
  './', './index.html', './styles.css', './questions.js',
  './pedagogy.js', './enhanced-fill.js', './app.js'
];
const OPTIONAL = ['./①点我打开题库.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

async function fetchFresh(request) {
  const response = await fetch(request, {cache: 'no-store'});
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${request.url || request}`);
  return response;
}

async function cacheOne(cache, url) {
  const request = new Request(url, {cache: 'reload'});
  await cache.put(request, await fetchFresh(request));
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(APP_CACHE);
    for (const url of REQUIRED) await cacheOne(cache, url);
    await Promise.allSettled(OPTIONAL.map(url => cacheOne(cache, url)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== APP_CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

async function appCacheFirst(request, fallback) {
  const cached = await caches.match(request, {cacheName: APP_CACHE});
  if (cached) return cached;
  try {
    const response = await fetchFresh(request);
    const cache = await caches.open(APP_CACHE);
    await cache.put(request, response.clone());
    return response;
  } catch (_) {
    return fallback ? (await caches.match(fallback, {cacheName: APP_CACHE})) || Response.error() : Response.error();
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.includes('/source/')) {
    event.respondWith((async () => {
      const cache = await caches.open(IMAGE_CACHE);
      const cached = await cache.match(request);
      if (cached) return cached;
      try {
        const response = await fetchFresh(request);
        await cache.put(request, response.clone());
        return response;
      } catch (_) {
        return new Response('原题图片暂不可用', {status: 503, headers: {'Content-Type': 'text/plain; charset=utf-8'}});
      }
    })());
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(appCacheFirst(request, './index.html'));
    return;
  }

  if (REQUIRED.concat(OPTIONAL).some(path => url.pathname.endsWith(path.slice(1)))) {
    event.respondWith(appCacheFirst(request));
  }
});
