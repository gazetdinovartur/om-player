const CACHE = 'om-v61';
const ASSETS = [
  '/build/player/om-player.iife.js',
  '/css/site.css',
  '/js/theme.js',
  '/js/site-nav.js',
  '/js/om-hero-viz.js',
  '/js/player-bridge.js',
  '/js/turbo.es2017-esm.js',
];

const NETWORK_FIRST = [
  '/build/player/om-player.iife.js',
  '/build/player/om-player.es.js',
  '/js/player-bridge.js',
  '/js/om-hero-viz.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw new Error('offline');
  }
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.startsWith('/media/covers/')) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  if (NETWORK_FIRST.includes(url.pathname)) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  if (ASSETS.includes(url.pathname)) {
    event.respondWith(cacheFirst(event.request));
  }
});
