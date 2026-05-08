'use client'

import { useState, useEffect, useCallback } from 'react'

/**
 * PWA 웹 푸시 구독 훅
 *
 * - Capacitor 네이티브 앱: 네이티브 알림 사용이므로 웹 푸시 스킵
 * - 브라우저(PWA): serviceWorker + pushManager 활용
 */
export function usePushSubscription() {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  // 현재 구독 상태 확인
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Capacitor 네이티브는 웹 푸시 불필요
    const cap = (window as any).Capacitor
    if (cap?.isNativePlatform?.()) return

    if (!('Notification' in window) || !('serviceWorker' in navigator)) return

    setPermission(Notification.permission)

    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => {})
  }, [])

  /**
   * 구독 요청 → 서버에 저장
   */
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('이 브라우저는 푸시 알림을 지원하지 않습니다.')
      return false
    }

    setLoading(true)
    try {
      // 권한 요청
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') {
        setLoading(false)
        return false
      }

      const reg = await navigator.serviceWorker.ready
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) throw new Error('VAPID 공개키 없음')

      // pushManager 구독
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as ArrayBuffer,
      })

      // 서버에 저장
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      })

      if (!res.ok) throw new Error('서버 구독 저장 실패')

      setSubscribed(true)
      return true
    } catch (err) {
      console.error('[push] 구독 실패:', err)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * 구독 해제
   */
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (!sub) { setSubscribed(false); return true }

      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      })
      await sub.unsubscribe()
      setSubscribed(false)
      return true
    } catch (err) {
      console.error('[push] 구독 해제 실패:', err)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return { permission, subscribed, loading, subscribe, unsubscribe }
}

/** Base64URL → Uint8Array 변환 (VAPID 공개키) */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i)
  }
  return output
}
