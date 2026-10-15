// Service worker mínimo: permite instalar o site como app.
// Sempre busca da internet (os dados mudam toda semana); sem conexão, mostra a última página aberta.
const CACHE = 'laplata-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copia = res.clone()
        caches.open(CACHE).then((c) => c.put(req, copia))
        return res
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('/')))
  )
})
