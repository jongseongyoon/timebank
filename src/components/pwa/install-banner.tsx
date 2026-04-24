'use client'

import { useEffect, useState } from 'react'
import { X, Download } from 'lucide-react'

const DISMISS_KEY = 'timepay_pwa_banner_dismissed'
const DISMISS_DAYS = 7

export function InstallBanner() {
  const [show, setShow] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    // 이미 설치된 경우 숨김
    if (window.matchMedia('(display-mode: standalone)').matches) return

    // 7일 이내 닫은 경우 숨김
    const dismissed = localStorage.getItem(DISMISS_KEY)
    if (dismissed) {
      const dismissedAt = Number(dismissed)
      const daysPassed = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24)
      if (daysPassed < DISMISS_DAYS) return
    }

    // Android Chrome: beforeinstallprompt 이벤트
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShow(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // iOS Safari: 설치 프롬프트 없음 → 수동 안내
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const isSafari = /safari/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent)
    if (isIOS && isSafari) {
      setShow(true)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function handleInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      deferredPrompt.userChoice.finally(() => {
        setDeferredPrompt(null)
        setShow(false)
      })
    }
  }

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setShow(false)
  }

  if (!show) return null

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:bottom-4 md:left-auto md:right-4 md:w-80">
      <div className="bg-white border border-blue-200 rounded-xl shadow-lg p-4">
        <div className="flex items-start gap-3">
          <div className="bg-blue-600 rounded-xl p-2 shrink-0">
            <Download className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">TimePay 앱 설치</p>
            {isIOS ? (
              <p className="text-xs text-gray-500 mt-1">
                Safari 하단 <strong>공유 버튼(↑)</strong>을 눌러<br />
                <strong>"홈 화면에 추가"</strong>를 선택하세요
              </p>
            ) : (
              <p className="text-xs text-gray-500 mt-1">
                홈 화면에 추가하면 앱처럼 사용할 수 있어요
              </p>
            )}
          </div>
          <button
            onClick={handleDismiss}
            className="shrink-0 text-gray-400 hover:text-gray-600 p-1"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {!isIOS && deferredPrompt && (
          <button
            onClick={handleInstall}
            className="mt-3 w-full bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            홈화면에 추가하기
          </button>
        )}
      </div>
    </div>
  )
}
