/* CACHE_NAME and PRECACHE_URLS are supplied by the production build. */
/* global CACHE_NAME, PRECACHE_URLS */
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith('flight-briefing-') && key !== CACHE_NAME)
      .map((key) => caches.delete(key)),
  )).then(() => self.clients.claim()))
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return
  event.respondWith(caches.open(CACHE_NAME).then(async (cache) => {
    if (event.request.mode === 'navigate') {
      return cache.match(new URL('index.html', self.registration.scope).href)
    }
    const cached = await cache.match(event.request)
    return cached || fetch(event.request)
  }))
})
