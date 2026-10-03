/* Service Worker mínimo y defensivo:
 * - cachea el shell de la app para abrir sin internet,
 * - nunca rompe nada si falla: ante cualquier error deja pasar la red,
 * - jamás intercepta llamadas al API (Supabase) ni POST.
 */
const CACHE = 'evanlu-v1'
const SHELL = ['/', '/index.html', '/manifest.webmanifest']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .catch(() => undefined),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .catch(() => undefined),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  const esApi =
    url.hostname.endsWith('supabase.co') || url.hostname.endsWith('supabase.in')
  if (esApi || url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copia = response.clone()
          caches.open(CACHE).then((cache) => cache.put('/index.html', copia)).catch(() => undefined)
          return response
        })
        .catch(() =>
          caches.match('/index.html').then((r) => r || Response.error()),
        ),
    )
    return
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copia = response.clone()
        caches.open(CACHE).then((cache) => cache.put(request, copia)).catch(() => undefined)
        return response
      })
      .catch(() => caches.match(request).then((r) => r || Response.error())),
  )
})
