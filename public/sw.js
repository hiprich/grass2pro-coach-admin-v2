// Minimal app-shell service worker for Grass2Pro Coach.
// Strategy:
//  - Hashed assets (Vite emits content-hashed filenames): cache-first.
//  - HTML navigation: network-first with cached fallback so a fresh GitHub
//    Pages deploy is picked up immediately and offline still works.
//  - Bumping CACHE_VERSION invalidates everything from prior deploys.

// Bump when you need browsers to discard cached hashed assets aggressively
// (e.g. Logo Studio preview pipeline, other SPA bundle changes sticking on clients).
const CACHE_VERSION = 'v14'
const CACHE_NAME = `g2p-coach-${CACHE_VERSION}`

// Paths the SW must NEVER cache and must always send straight to the network.
// API responses (Netlify Functions or the Cloudflare Worker proxy) change as
// coaches update Airtable, so a cache-first hit would freeze the dashboard on
// the first response a browser saw — which is exactly the staleness bug that
// made the staging deploy show old/demo data after a real Airtable record was
// created.
function isApiRequest(url) {
  return (
    url.pathname.startsWith('/.netlify/functions/') ||
    url.pathname.startsWith('/api/')
  )
}

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

// ---------------------------------------------------------------------------
// Web Push
// ---------------------------------------------------------------------------
//
// The server (Netlify scheduled function) sends payloads shaped like:
//   {
//     title: string,         // e.g. "Hope Bouhe — U8s Strikers"
//     body: string,          // e.g. "Pickup soon — session ends in 30 min"
//     tag?: string,          // dedupe key, e.g. `session-${sessionId}-pickup`
//     url?: string,          // deep-link to open on click, defaults to /portal
//     icon?: string,         // icon URL, defaults to brand icon
//     badge?: string,        // monochrome badge for Android status bar
//     data?: Record<string, unknown>, // forwarded to notificationclick
//   }
//
// We never trust the payload to be valid JSON — `event.data?.json()` throws
// on bad input, so we fall back to text() and a safe default. Showing *some*
// notification is required: Chrome will warn the user if a push wakes the SW
// without showing one.
self.addEventListener('push', (event) => {
  /** @type {any} */
  let payload = {}
  if (event.data) {
    try {
      payload = event.data.json()
    } catch {
      try {
        payload = { body: event.data.text() }
      } catch {
        payload = {}
      }
    }
  }

  const title =
    typeof payload.title === 'string' && payload.title.trim()
      ? payload.title
      : 'Grass2Pro'
  const body =
    typeof payload.body === 'string' && payload.body.trim()
      ? payload.body
      : 'You have a new update.'

  const options = {
    body,
    tag: typeof payload.tag === 'string' ? payload.tag : undefined,
    // renotify only meaningful when tag is set; harmless otherwise.
    renotify: typeof payload.tag === 'string',
    icon:
      typeof payload.icon === 'string'
        ? payload.icon
        : '/icons/icon-192.png',
    badge:
      typeof payload.badge === 'string'
        ? payload.badge
        : '/icons/icon-192.png',
    data: {
      url: typeof payload.url === 'string' ? payload.url : '/portal',
      ...(payload.data && typeof payload.data === 'object' ? payload.data : {}),
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// On click: focus an existing client at the deep-link URL if one is open,
// otherwise open a new window. Same-origin only — we never navigate to an
// external URL even if the payload tries to inject one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const data = event.notification.data || {}
  const rawUrl = typeof data.url === 'string' ? data.url : '/portal'

  /** @type {URL} */
  let target
  try {
    target = new URL(rawUrl, self.location.origin)
  } catch {
    target = new URL('/portal', self.location.origin)
  }
  // Hard-block cross-origin — the SW must never be a redirect oracle.
  if (target.origin !== self.location.origin) {
    target = new URL('/portal', self.location.origin)
  }

  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      for (const client of all) {
        try {
          const clientUrl = new URL(client.url)
          if (
            clientUrl.origin === target.origin &&
            clientUrl.pathname.toLowerCase() === target.pathname.toLowerCase()
          ) {
            await client.focus()
            return
          }
        } catch {
          /* skip unparseable client URLs */
        }
      }
      // Fall back: any same-origin client → focus + navigate.
      for (const client of all) {
        try {
          if (new URL(client.url).origin === target.origin) {
            await client.focus()
            if ('navigate' in client) {
              try {
                await client.navigate(target.href)
              } catch {
                /* navigate not always allowed; the focus alone is fine */
              }
            }
            return
          }
        } catch {
          /* skip */
        }
      }
      // Nothing open → new window.
      if (self.clients.openWindow) {
        await self.clients.openWindow(target.href)
      }
    })(),
  )
})

// pushsubscriptionchange: browsers can rotate subscriptions silently. When
// that happens we resubscribe with the same VAPID key and POST the new
// endpoint to the server so notifications keep flowing. The applicationServerKey
// is hard-coded here because the SW can't import from the app bundle and
// we already commit the public key to source.
const VAPID_PUBLIC_KEY_B64URL =
  'BKRxsMY8W_99iZW2ysx-K20CPqw8AHf8xs8svJ9iOnbII1xODY7jSyK95T8DwO9lMpNP0rN-WBjxRu_Y2H-0Wy4'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i)
  return out
}

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const sub = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY_B64URL),
        })
        const json = sub.toJSON()
        await fetch('/.netlify/functions/parent-push-subscribe', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            reason: 'pushsubscriptionchange',
            endpoint: json.endpoint,
            keys: json.keys,
            userAgent: self.navigator?.userAgent || '',
          }),
        })
      } catch {
        /* swallow — we'll resubscribe lazily on next page load */
      }
    })(),
  )
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

  // Bypass the SW entirely for API calls so coaches always see fresh Airtable
  // data. Returning without calling respondWith lets the browser do its own
  // network fetch.
  if (isApiRequest(url)) return

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
