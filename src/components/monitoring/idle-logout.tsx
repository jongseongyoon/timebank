'use client'
/**
 * 세션 자동 만료 (명령서 §4.8)
 * 미사용 20분 후 자동 로그아웃. 사용자 활동 시 타이머 리셋.
 */
import { useEffect, useRef } from 'react'
import { signOut } from 'next-auth/react'

// 폰 홈화면 바로가기로 수시 조회하는 용도라 60분으로 완화 (민감정보 보안 유지 + 편의)
const IDLE_MS = 60 * 60 * 1000

export function IdleLogout() {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const reset = () => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        // 재로그인 후 보던 화면으로 복귀하도록 현재 경로를 callbackUrl로 보존
        const back = encodeURIComponent(window.location.pathname)
        signOut({ callbackUrl: `/login?callbackUrl=${back}` })
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
