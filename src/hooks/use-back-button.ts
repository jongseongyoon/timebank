'use client'

import { useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'

/**
 * Android 뒤로가기 버튼 처리 훅
 *
 * 동작:
 * - 홈('/')에 있거나 히스토리 없음 → minimizeApp() (앱 최소화)
 * - 그 외 → router.back() (이전 화면)
 *
 * 구현:
 * - window.Capacitor.Plugins.App 직접 접근 (구 APK 호환, npm import 불필요)
 * - @capacitor/app npm 패키지로 폴백
 * - 깊이 카운터로 홈 여부 이중 확인
 */
export function useBackButton() {
  const router = useRouter()
  const pathname = usePathname()
  const pathnameRef = useRef(pathname)
  const depthRef = useRef(0)

  // pathname 변경마다 ref 동기화 + 깊이 갱신
  useEffect(() => {
    const prev = pathnameRef.current
    pathnameRef.current = pathname
    if (pathname === '/') {
      depthRef.current = 0
    } else if (prev !== pathname) {
      depthRef.current = Math.max(depthRef.current, 1)
    }
  }, [pathname])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const cap = (window as any).Capacitor
    if (!cap?.isNativePlatform?.()) return

    // removeListener 저장용
    let removeListener: (() => void) | null = null

    function attachBackButton(AppPlugin: any) {
      AppPlugin.addListener(
        'backButton',
        ({ canGoBack }: { canGoBack: boolean }) => {
          const isHome = pathnameRef.current === '/' || depthRef.current === 0

          if (isHome || !canGoBack) {
            // 최소화 (홈 화면으로 내려가기)
            Promise.resolve(AppPlugin.minimizeApp()).catch(() => {
              try { AppPlugin.exitApp() } catch {}
            })
          } else {
            depthRef.current = Math.max(0, depthRef.current - 1)
            router.back()
          }
        }
      ).then((handle: any) => {
        removeListener = () => { try { handle.remove() } catch {} }
      }).catch(() => {})
    }

    // 1순위: window.Capacitor.Plugins.App (APK에 빌드된 네이티브 플러그인 직접 접근)
    const NativeApp = cap.Plugins?.App
    if (NativeApp) {
      attachBackButton(NativeApp)
    } else {
      // 2순위: npm 패키지 동적 import
      import('@capacitor/app')
        .then(({ App: CapApp }) => attachBackButton(CapApp))
        .catch(() => {})
    }

    return () => { removeListener?.() }
  }, [router])
}
