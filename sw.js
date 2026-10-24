const BUILD_VERSION = '__BUILD_VERSION__';
const CACHE_PREFIX = 'shenrenliu-qbank-app-';
const APP_CACHE = `${CACHE_PREFIX}v3.0-shenzhongshen-r1-${BUILD_VERSION}`;
const IMAGE_CACHE = 'shenrenliu-qbank-images-v2';
const LEGACY_IMAGE_CACHE = 'shenrenliu-qbank-images-v1';
const REQUIRED = [
  './', './index.html', './styles.css', './banks/catalog.js', './banks/sinotruk-culture-official.js', './culture-insights.js', './hos-analysis.js', './explanation-core.js', './backup-core.js', './backup-ui.js', './bank-core.js', './bank-runtime.js', './questions.js',
  './pedagogy.js', './enhanced-fill.js', './transfer-code.js', './lulu.js', './ultra-content.js', './ultra-core.js', './lulu-mascot.png', './app.js', './pwa-install.js',
  './styles.css?v=3.0-shenzhongshen-r1', './app.js?v=3.0-shenzhongshen-r1', './pwa-install.js?v=3.0-shenzhongshen-r1', './pwa-install.js?v=3.0-update-20261024'
];
const OPTIONAL = ['./①点我打开题库.html', './manifest.webmanifest', './icon-source.svg', './icon-16.png', './icon-32.png', './icon-48.png', './icon-64.png', './icon-128.png', './icon-256.png', './icon-192.png', './icon-512.png', './icon-192-maskable.png', './icon-512-maskable.png', './manifest.webmanifest?v=3.0-shenzhongshen-r1', ...[16,32,48,64,128,192,256,512].map(n=>`./icon-${n}.png?v=3.0-shenzhongshen-r1`), './icon-192-maskable.png?v=3.0-shenzhongshen-r1', './icon-512-maskable.png?v=3.0-shenzhongshen-r1'];

async function fetchFresh(request) {
  const abort=typeof AbortController!=='undefined'?new AbortController():null;
  const timer=abort?setTimeout(()=>abort.abort(),20000):null;
  try{
    const response = await fetch(request, {cache: 'no-store',...(abort?{signal:abort.signal}:{})});
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${request.url || request}`);
    // Keep the timeout active until the complete body arrives, not just the response headers.
    await response.clone().arrayBuffer();
    return response;
  }finally{if(timer)clearTimeout(timer);}
}

async function cacheOne(cache, url) {
  const request = new Request(url, {cache: 'reload'});
  const fresh=new URL(request.url);fresh.searchParams.set('__build',BUILD_VERSION);
  await cache.put(request, await fetchFresh(new Request(fresh.href,{cache:'no-store'})));
}

async function precacheRequired(cache) {
  // Fetch each asset once, then cache its compatibility query aliases. Limit parallel work on mobile.
  const groups=new Map();for(const url of REQUIRED){const key=new Request(url).url.split('?')[0];if(!groups.has(key))groups.set(key,[]);groups.get(key).push(url);}
  const queue=[...groups.values()];let next=0,done=0,failed=false;
  const progress=async()=>{if(!self.clients.matchAll)return;for(const client of await self.clients.matchAll({type:'window',includeUncontrolled:true}))client.postMessage({type:'UPDATE_PROGRESS',version:BUILD_VERSION,done,total:queue.length});};
  const jobs=await Promise.allSettled(Array.from({length:Math.min(4,queue.length)},async()=>{try{while(!failed&&next<queue.length){const urls=queue[next++],fresh=new URL(new Request(urls[0]).url);fresh.searchParams.set('__build',BUILD_VERSION);let response;for(let attempt=0;attempt<2;attempt++){try{response=await fetchFresh(new Request(fresh.href,{cache:'no-store'}));break;}catch(error){if(attempt===1)throw error;}}for(const url of urls)await cache.put(new Request(url),response.clone());done++;if(!failed)await progress();}}catch(error){failed=true;throw error;}}));
  const error=jobs.find(job=>job.status==='rejected');if(error)throw error.reason;
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(APP_CACHE);
    await precacheRequired(cache);
    await Promise.allSettled(OPTIONAL.map(url => cacheOne(cache, url)));
    // First installation may claim immediately. Updates wait for a safe, explicit activation.
    if (!self.registration?.active) await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    // Preserve previously viewed screenshots for offline use, then retire the old cache.
    if (keys.includes(LEGACY_IMAGE_CACHE)) {
      const oldCache = await caches.open(LEGACY_IMAGE_CACHE);
      const imageCache = await caches.open(IMAGE_CACHE);
      for (const request of await oldCache.keys()) {
        if (!(await imageCache.match(request))) {
          const response = await oldCache.match(request);
          if (response) await imageCache.put(request, response);
        }
      }
      await caches.delete(LEGACY_IMAGE_CACHE);
    }
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== APP_CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'GET_VERSION') event.ports?.[0]?.postMessage({version:BUILD_VERSION});
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

  // Version checks must always reach the server, including manual cache-busting requests.
  if (url.pathname.endsWith('/release.json')) {
    event.respondWith(fetchFresh(request).catch(()=>new Response('版本服务暂不可用',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}})));
    return;
  }

  if (url.pathname.includes('/source/')) {
    event.respondWith((async () => {
      const cache = await caches.open(IMAGE_CACHE);
      try {
        const response = await fetchFresh(request);
        await cache.put(request, response.clone());
        return response;
      } catch (_) {
        const cached = await cache.match(request) || await caches.match(request);
        if (cached) return cached;
        return new Response('原题图片暂不可用', {status: 503, headers: {'Content-Type': 'text/plain; charset=utf-8'}});
      }
    })());
    return;
  }

  if (url.pathname.includes('/banks/')) {event.respondWith(appCacheFirst(request));return;}
  if (request.mode === 'navigate') {
    event.respondWith(appCacheFirst(request, './index.html'));
    return;
  }

  if (REQUIRED.concat(OPTIONAL).some(path => url.pathname.endsWith(path.slice(1)))) {
    event.respondWith(appCacheFirst(request));
  }
});
