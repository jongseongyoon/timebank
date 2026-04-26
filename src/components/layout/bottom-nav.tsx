'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { QrCode, ScanLine, X } from 'lucide-react'

const NAV_ITEMS = [
  {
    href: '/',
    label: '홈',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" width="24" height="24" fill={active ? '#3b5bdb' : 'none'}
        stroke={active ? '#3b5bdb' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
        <path d="M9 21V12h6v9"/>
      </svg>
    ),
  },
  {
    href: '/services/browse',
    label: '서비스',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none"
        stroke={active ? '#3b5bdb' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87"/>
        <path d="M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
  },
  // 중앙 QR 버튼 — 탭 시 바텀 시트 표시
  {
    href: '__qr__',
    label: 'QR',
    icon: () => (
      <div className="w-12 h-12 -mt-6 bg-[#3b5bdb] rounded-full flex items-center justify-center shadow-lg border-4 border-white">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none"
          stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1"/>
          <rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/>
          <path d="M14 14h2v2h-2zM18 14h3M14 18v3M18 18h3v3h-3z"/>
        </svg>
      </div>
    ),
  },
  {
    href: '/community',
    label: '커뮤니티',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none"
        stroke={active ? '#3b5bdb' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
      </svg>
    ),
  },
  {
    href: '/profile',
    label: '내정보',
    icon: (active: boolean) => (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none"
        stroke={active ? '#3b5bdb' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
]

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [qrSheetOpen, setQrSheetOpen] = useState(false)

  return (
    <>
      {/* ── 하단 네비게이션 바 ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white border-t border-gray-200 safe-area-bottom">
        <div className="flex items-end justify-around h-16 px-2">
          {NAV_ITEMS.map(({ href, label, icon }) => {
            const isQR = href === '__qr__'
            const active = isQR ? false : href === '/' ? pathname === '/' : pathname.startsWith(href)

            if (isQR) {
              return (
                <button
                  key="qr"
                  onClick={() => setQrSheetOpen(true)}
                  className="flex flex-col items-center justify-end gap-0.5 flex-1 pb-2 min-h-[48px]"
                  aria-label="QR 코드"
                >
                  {icon(false)}
                </button>
              )
            }

            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center justify-end gap-0.5 flex-1 pb-2 min-h-[48px]"
                aria-current={active ? 'page' : undefined}
              >
                {icon(active)}
                <span
                  className="text-[10px] font-medium"
                  style={{ color: active ? '#3b5bdb' : '#9ca3af' }}
                >
                  {label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* ── QR 바텀 시트 ── */}
      {qrSheetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center md:hidden"
          onClick={() => setQrSheetOpen(false)}
        >
          {/* 반투명 배경 */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* 시트 패널 */}
          <div
            className="relative bg-white rounded-t-3xl w-full max-w-lg pb-safe"
            onClick={e => e.stopPropagation()}
          >
            {/* 드래그 핸들 */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* 타이틀 + 닫기 */}
            <div className="flex items-center justify-between px-5 py-3">
              <h2 className="text-lg font-bold">QR 코드</h2>
              <button
                onClick={() => setQrSheetOpen(false)}
                className="p-1.5 rounded-full hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="px-4 pb-6 space-y-3">
              {/* ① 내 QR 코드 보기 — 서비스 받는 사람 */}
              <button
                onClick={() => { setQrSheetOpen(false); router.push('/wallet/qr') }}
                className="flex items-center gap-4 w-full p-4 rounded-2xl bg-blue-50 border-2 border-blue-200 hover:bg-blue-100 active:bg-blue-200 transition-colors text-left"
              >
                <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                  <QrCode className="h-7 w-7 text-white" />
                </div>
                <div>
                  <p className="font-bold text-blue-900 text-base">내 QR 코드 보기</p>
                  <p className="text-sm text-blue-600 mt-0.5">
                    서비스를 <strong>받을 때</strong> 상대방에게 보여주세요
                  </p>
                </div>
              </button>

              {/* ② 상대방 QR 스캔 — 서비스 제공하는 사람 */}
              <button
                onClick={() => { setQrSheetOpen(false); router.push('/scan') }}
                className="flex items-center gap-4 w-full p-4 rounded-2xl bg-gray-50 border-2 border-gray-200 hover:bg-gray-100 active:bg-gray-200 transition-colors text-left"
              >
                <div className="w-14 h-14 bg-gray-700 rounded-2xl flex items-center justify-center shrink-0">
                  <ScanLine className="h-7 w-7 text-white" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-base">상대방 QR 스캔</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    서비스를 <strong>제공할 때</strong> · TC 송금 시 사용
                  </p>
                </div>
              </button>

              {/* 설명 박스 */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 leading-relaxed">
                💡 <strong>서비스를 받는 분</strong>이 내 QR을 보여주면,<br />
                <strong>서비스를 제공하는 분</strong>이 그 QR을 스캔합니다.
              </div>

              <button
                onClick={() => setQrSheetOpen(false)}
                className="w-full py-3 text-sm text-muted-foreground"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
