const CACHE_NAME = 'timepay-v5'
const STATIC_ASSETS = [
  '/',
  '/login',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
]

// 설치: 정적 자산 캐시
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// 활성화: 구버전 캐시 삭제
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
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
    icon: payload.icon ?? '/icons/icon-192.svg',
    badge: payload.badge ?? '/icons/icon-192.svg',
    data: { link: payload.link ?? '/' },
    vibrate: [200, 100, 200],
    requireInteraction: false,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// 알림 클릭 시 해당 링크로 이동
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

// 네트워크 우선 전략 (Network First)
self.addEventListener('fetch', (event) => {
  // API 요청은 캐시하지 않음
  if (event.request.url.includes('/api/')) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 성공 시 캐시에 저장
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => {
        // 오프라인 시 캐시에서 제공
        return caches.match(event.request).then((cached) => {
          if (cached) return cached
          // 캐시도 없으면 오프라인 페이지 반환
          if (event.request.mode === 'navigate') {
            return caches.match('/')
          }
        })
      })
  )
})
