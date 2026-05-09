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
 * - 내비게이션 깊이 카운터로 홈 여부 판단 (canGoBack 미사용 — Next.js SPA에서 불안정)
 */
export function useBackButton() {
  const router = useRouter()
  const pathname = usePathname()
  const pathnameRef = useRef(pathname)
  const depthRef = useRef(0)
  // router.back() 호출 후 pathname 변경 시 depth를 중복 증가하지 않기 위한 플래그
  const justWentBackRef = useRef(false)

  // pathname 변경마다 ref 동기화 + 깊이 갱신
  useEffect(() => {
    const prev = pathnameRef.current
    pathnameRef.current = pathname

    if (pathname === '/') {
      depthRef.current = 0
      justWentBackRef.current = false
    } else if (prev !== pathname) {
      if (justWentBackRef.current) {
        // 뒤로가기로 인한 변경 → 핸들러에서 이미 depth 감소 처리
        justWentBackRef.current = false
      } else {
        // 앞으로 이동 → depth 1 증가
        depthRef.current += 1
      }
    }
  }, [pathname])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const cap = (window as any).Capacitor
    if (!cap?.isNativePlatform?.()) return

    // removeListener 저장용
    let removeListener: (() => void) | null = null

    function attachBackButton(AppPlugin: any) {
      const result = AppPlugin.addListener(
        'backButton',
        // canGoBack은 Next.js SPA + server.url 환경에서 신뢰할 수 없으므로 사용하지 않음
        (_: { canGoBack: boolean }) => {
          const isHome = pathnameRef.current === '/' || depthRef.current === 0

          if (isHome) {
            // 최소화 (홈 화면으로 내려가기)
            Promise.resolve(AppPlugin.minimizeApp()).catch(() => {
              try { AppPlugin.exitApp() } catch {}
            })
          } else {
            justWentBackRef.current = true
            depthRef.current = Math.max(0, depthRef.current - 1)
            router.back()
          }
        }
      )

      // 네이티브 플러그인(window.Capacitor.Plugins.App)은 핸들을 동기로 반환,
      // npm @capacitor/app 패키지는 Promise를 반환 — 양쪽 모두 대응
      if (result && typeof result.then === 'function') {
        result.then((handle: any) => {
          removeListener = () => { try { handle.remove() } catch {} }
        }).catch(() => {})
      } else if (result && typeof result.remove === 'function') {
        removeListener = () => { try { result.remove() } catch {} }
      }
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
