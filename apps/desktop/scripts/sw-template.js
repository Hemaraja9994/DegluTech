/* DegluTech service worker: keeps the app on the device so it opens without a connection.
   Generated at build time by vite.config.ts (precache list and version are filled in). */
const VERSION = '__VERSION__';
const CORE = `deglutech-core-${VERSION}`;
const RUNTIME = 'deglutech-runtime-v1';
const PRECACHE = __PRECACHE__;
const scoped = (path) => new URL(path, self.registration.scope).href;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CORE).then((cache) => cache.addAll(PRECACHE.map(scoped))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('deglutech-core-') && k !== CORE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const fromCacheThenNetwork = async (request, cacheName) => {
  const hit = await caches.match(request, { ignoreSearch: true });
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok && response.type === 'basic') (await caches.open(cacheName)).put(request, response.clone());
  return response;
};

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Pages: try the network first so updates arrive; fall back to the saved app when offline.
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) (await caches.open(CORE)).put(scoped('index.html'), response.clone());
        return response;
      } catch {
        return (await caches.match(scoped('index.html'))) || Response.error();
      }
    })());
    return;
  }
  // Text-recognition data, PDF reader data and the manuals are saved the first time they are used.
  if (/\/(ocr|pdfjs|downloads)\//.test(url.pathname)) { event.respondWith(fromCacheThenNetwork(request, RUNTIME)); return; }
  // Everything else built into the app (hashed assets, fonts, icons, 3D models).
  event.respondWith(fromCacheThenNetwork(request, RUNTIME).catch(() => caches.match(request, { ignoreSearch: true }).then((r) => r || Response.error())));
});
