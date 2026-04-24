'use client'

import { useEffect, useState } from 'react'

export function SplashScreen() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // PWA standalone 모드일 때만 스플래시 표시
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    const shown = sessionStorage.getItem('timepay_splash_shown')
    if (isStandalone && !shown) {
      setVisible(true)
      sessionStorage.setItem('timepay_splash_shown', '1')
      setTimeout(() => setVisible(false), 1500)
    }
  }, [])

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#3b5bdb]"
      aria-hidden="true"
    >
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        {/* 로고 아이콘 */}
        <div className="w-24 h-24 rounded-3xl bg-white/20 flex items-center justify-center">
          <svg viewBox="0 0 192 192" width="72" height="72" xmlns="http://www.w3.org/2000/svg">
            <circle cx="96" cy="88" r="42" fill="none" stroke="white" stroke-width="7"/>
            <circle cx="96" cy="88" r="4" fill="white"/>
            <line x1="96" y1="88" x2="96" y2="60" stroke="white" stroke-width="6" stroke-linecap="round"/>
            <line x1="96" y1="88" x2="118" y2="88" stroke="white" stroke-width="5" stroke-linecap="round"/>
            <circle cx="96" cy="152" r="12" fill="white"/>
            <path d="M68 185 Q68 167 96 167 Q124 167 124 185" fill="white"/>
          </svg>
        </div>
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white tracking-tight">TimePay</h1>
          <p className="text-blue-200 text-sm mt-1">시간으로 연결하는 주민 공동체</p>
        </div>
      </div>
    </div>
  )
}
