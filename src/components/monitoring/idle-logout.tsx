'use client'
/**
 * 세션 자동 만료 (명령서 §4.8)
 * 미사용 20분 후 자동 로그아웃. 사용자 활동 시 타이머 리셋.
 */
import { useEffect, useRef } from 'react'
import { signOut } from 'next-auth/react'

const IDLE_MS = 20 * 60 * 1000

export function IdleLogout() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const reset = () => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        signOut({ callbackUrl: '/login' })
      }, IDLE_MS)
    }
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'visibilitychange']
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }))
    reset()
    return () => {
      if (timer.current) clearTimeout(timer.current)
      events.forEach((e) => window.removeEventListener(e, reset))
    }
  }, [])

  return null
}
