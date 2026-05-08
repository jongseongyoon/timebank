'use client'

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'

/**
 * Android 뒤로가기 버튼 처리 훅
 *
 * 동작:
 * - 현재 경로가 '/' (홈 대시보드) → 앱 최소화 (minimizeApp)
 * - 그 외 경로 → 이전 화면으로 이동 (router.back)
 * - 이전 히스토리 없음(canGoBack=false) → 앱 최소화
 *
 * 수정 내역:
 * - usePathname()으로 현재 경로 추적 (stale closure 방지)
 * - async cleanup 버그 수정 (listener handle을 ref로 관리)
 */
export function useBackButton() {
  const router = useRouter()
  const pathname = usePathname()
  const pathnameRef = useRef(pathname)

  // pathname이 바뀔 때마다 ref 업데이트 (effect 클로저에서 최신값 참조)
  useEffect(() => {
    pathnameRef.current = pathname
  }, [pathname])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!(window as any).Capacitor?.isNativePlatform?.()) return

    let listenerHandle: { remove: () => void } | null = null

    import('@capacitor/app').then(({ App: CapApp }) => {
      CapApp.addListener('backButton', ({ canGoBack }: { canGoBack: boolean }) => {
        const current = pathnameRef.current

        // 홈(/) 또는 히스토리 없음 → 최소화
        if (current === '/' || !canGoBack) {
          CapApp.minimizeApp()
        } else {
          router.back()
        }
      }).then((handle) => {
        listenerHandle = handle
      })
    })

    // 컴포넌트 언마운트 시 리스너 제거
    return () => {
      listenerHandle?.remove()
    }
  }, [router]) // router는 안정적 — 마운트 1회만 실행
}
