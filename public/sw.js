// Minimal app-shell service worker for Grass2Pro Coach.
// Strategy:
//  - Hashed assets (Vite emits content-hashed filenames): cache-first.
//  - HTML navigation: network-first with cached fallback so a fresh GitHub
//    Pages deploy is picked up immediately and offline still works.
//  - Bumping CACHE_VERSION invalidates everything from prior deploys.

const CACHE_VERSION = 'v2'
const CACHE_NAME = `g2p-coach-${CACHE_VERSION}`

// Pre-cache only the lightest shell. Vite-hashed JS/CSS get cached lazily
// on first hit, which keeps the install step fast and avoids referencing
// filenames we can't know at build time without a generator step.
const PRECACHE_URLS = [
  './',
  './index.html',
  './favicon.svg',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // addAll is atomic; if any precache fetch fails, the SW won't activate
      // and we silently fall back to no-SW behaviour on the next load.
      cache.addAll(PRECACHE_URLS).catch(() => undefined),
    ),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)),
      )
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})

function isHtmlRequest(request) {
  if (request.mode === 'navigate') return true
  const accept = request.headers.get('accept') || ''
  return accept.includes('text/html')
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  // Only handle same-origin; let the network handle Fontshare, analytics, etc.
  if (url.origin !== self.location.origin) return

  if (isHtmlRequest(request)) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request)
          const cache = await caches.open(CACHE_NAME)
          cache.put(request, fresh.clone()).catch(() => undefined)
          return fresh
        } catch {
          const cached = await caches.match(request)
          if (cached) return cached
          const fallback = await caches.match('./index.html')
          if (fallback) return fallback
          return new Response('Offline', { status: 503, statusText: 'Offline' })
        }
      })(),
    )
    return
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(request)
      if (cached) return cached
      try {
        const fresh = await fetch(request)
        if (fresh.ok && (fresh.type === 'basic' || fresh.type === 'default')) {
          const cache = await caches.open(CACHE_NAME)
          cache.put(request, fresh.clone()).catch(() => undefined)
        }
        return fresh
      } catch {
        return new Response('', { status: 504, statusText: 'Offline' })
      }
    })(),
  )
})
