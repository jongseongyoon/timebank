const CACHE_NAME = 'timepay-v6'
const STATIC_ASSETS = [
  '/',
  '/login',
  '/offline',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-192.svg',
  '/icons/apple-touch-icon.png',
  '/favicon-32.png',
]

// ── 설치: 정적 자산 사전 캐시 ────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(STATIC_ASSETS).catch(() => {})
    )
  )
  self.skipWaiting()
})

// ── 활성화: 구버전 캐시 삭제 ─────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// ── Fetch: Network First + 오프라인 Fallback ─────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // 다른 origin, API, Next.js 내부 경로 → 캐시 건드리지 않음
  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/static/') // 정적 JS/CSS는 브라우저가 캐시
  ) return

  // HTML 탐색 요청: Network First
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE_NAME).then((c) => c.put(request, clone))
          }
          return res
        })
        .catch(() =>
          caches.match(request)
            .then((cached) => cached || caches.match('/offline') || caches.match('/'))
        )
    )
    return
  }

  // 이미지 / 아이콘: Cache First
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/favicon') ||
    request.destination === 'image'
  ) {
    event.respondWith(
      caches.match(request).then((cached) =>
        cached || fetch(request).then((res) => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(CACHE_NAME).then((c) => c.put(request, clone))
          }
          return res
        })
      )
    )
    return
  }

  // 그 외 (폰트, manifest 등): Stale While Revalidate
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((res) => {
          if (res.ok) cache.put(request, res.clone())
          return res
        }).catch(() => cached)
        return cached || fetchPromise
      })
    )
  )
})

// ── 웹 푸시 수신 ──────────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = { title: '타임뱅크', body: event.data.text(), link: '/' }
  }

  const title = payload.title ?? '타임뱅크'
  const options = {
    body: payload.body ?? '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { link: payload.link ?? '/' },
    vibrate: [200, 100, 200],
    requireInteraction: false,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// ── 알림 클릭: 해당 링크로 이동 ──────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const link = event.notification.data?.link ?? '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(link)
          return client.focus()
        }
      }
      return clients.openWindow(link)
    })
  )
})
