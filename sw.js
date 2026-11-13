const CACHE = 'eat-wheel-v3';
const SHELL = [
  './',
  'index.html',
  'styles.css',
  'manifest.webmanifest',
  'icon.svg',
  'src/app.js',
  'src/csv.js',
  'src/store.js',
  'src/wheel-model.js',
  'src/wheel-canvas.js',
  'src/sound.js',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Serve from cache, refresh the cache in the background so the next load gets updates.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(event.request, { ignoreSearch: true });
    const network = fetch(event.request)
      .then(res => {
        if (res.ok) cache.put(event.request, res.clone());
        return res;
      })
      .catch(() => cached);
    event.waitUntil(network);
    return cached ?? network;
  }));
});
