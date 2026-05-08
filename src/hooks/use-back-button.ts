'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Android 뒤로가기 버튼 처리 훅
 * - Capacitor @capacitor/app 의 backButton 이벤트를 구독
 * - 브라우저 히스토리가 남아있으면 router.back()
 * - 히스토리가 없으면 (홈 화면 등) 앱 최소화 (moveToBackground)
 */
export function useBackButton() {
  const router = useRouter()

  useEffect(() => {
    // Capacitor 환경(APK)이 아닐 경우 무시
    if (typeof window === 'undefined') return
    if (!(window as any).Capacitor?.isNativePlatform?.()) return

    let App: any = null

    import('@capacitor/app').then(({ App: CapApp }) => {
      App = CapApp

      const handler = CapApp.addListener('backButton', ({ canGoBack }: { canGoBack: boolean }) => {
        if (canGoBack) {
          router.back()
        } else {
          // 히스토리 없음 → 앱 최소화 (Android 홈 화면으로)
          CapApp.minimizeApp()
        }
      })

      // cleanup: 언마운트 시 리스너 제거
      return () => {
        handler.then((h: any) => h.remove())
      }
    })
  }, [router])
}
