/* CACHE_NAME, APP_SHELL_URL and PRECACHE_URLS are supplied by the production build. */
/* global CACHE_NAME, APP_SHELL_URL, PRECACHE_URLS */
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS.map((url) => new Request(url, { cache: 'reload' })))))
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
      const shell = await cache.match(APP_SHELL_URL, { ignoreVary: true })
      return shell || fetch(event.request)
    }
    const cached = await cache.match(event.request, { ignoreVary: true })
    return cached || fetch(event.request)
  }))
})
