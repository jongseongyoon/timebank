'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import {
  Bell, LogOut, User, Menu, X, Coins,
  LayoutDashboard, Wallet, ArrowLeftRight, ClipboardList,
  PlusCircle, ListChecks, Search, Footprints, MessageSquare,
  QrCode, ScanLine,
} from 'lucide-react'

const navItems = [
  { href: '/', label: '홈 대시보드', icon: LayoutDashboard },
  { href: '/wallet', label: 'TC 지갑', icon: Wallet },
  { href: '/wallet/qr', label: '내 QR 코드', icon: QrCode },
  { href: '/scan', label: 'QR 스캔 거래', icon: ScanLine },
  { href: '/history', label: '거래 내역', icon: ArrowLeftRight },
  { href: '/services/browse', label: '서비스 찾기', icon: Search },
  { href: '/services/request', label: '서비스 요청', icon: ClipboardList },
  { href: '/services/my-requests', label: '내 요청 목록', icon: ListChecks },
  { href: '/services/register', label: '서비스 등록', icon: PlusCircle },
  { href: '/walk', label: '만보기', icon: Footprints },
  { href: '/community', label: '커뮤니티', icon: MessageSquare },
  { href: '/profile', label: '내 정보', icon: User },
]

export function Header() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      {/* ── 헤더 바 ── */}
      <header className="h-14 border-b bg-white flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
        {/* 햄버거 — 모바일 전용 */}
        <button
          className="md:hidden p-2 rounded-md hover:bg-gray-100 active:bg-gray-200 transition-colors"
          onClick={() => setDrawerOpen(true)}
          aria-label="메뉴 열기"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* 데스크톱 로고 영역 */}
        <div className="hidden md:flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            {session?.user?.name}님
          </span>
        </div>

        {/* 오른쪽 아이콘 그룹 */}
        <div className="flex items-center gap-1">
          {/* 알림 벨 */}
          <Link
            href="/notifications"
            className="p-2 rounded-md hover:bg-gray-100 active:bg-gray-200 transition-colors relative"
            aria-label="알림"
          >
            <Bell className="h-5 w-5" />
          </Link>

          {/* 구분선 */}
          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* 프로필 아이콘 */}
          <Link
            href="/profile"
            className="w-9 h-9 rounded-full bg-primary/10 hover:bg-primary/20 active:bg-primary/30 transition-colors flex items-center justify-center"
            aria-label="내 정보"
          >
            <User className="h-4 w-4 text-primary" />
          </Link>

          {/* 이름 (데스크톱) */}
          <span className="hidden md:block text-sm font-medium ml-1">
            {session?.user?.name}
          </span>

          {/* 로그아웃 */}
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="p-2 rounded-md hover:bg-gray-100 active:bg-gray-200 transition-colors ml-1"
            aria-label="로그아웃"
          >
            <LogOut className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      </header>

      {/* ── 모바일 드로어 ── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="메뉴"
        >
          {/* 어두운 오버레이 */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />

          {/* 드로어 패널 */}
          <nav
            className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* 드로어 헤더 */}
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div className="flex items-center gap-2">
                <div className="bg-primary rounded-full p-1.5">
                  <Coins className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold text-lg">TimePay</span>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                aria-label="메뉴 닫기"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 사용자 정보 */}
            <div className="px-5 py-3 border-b bg-gray-50">
              <p className="text-xs text-muted-foreground">로그인 계정</p>
              <p className="font-semibold text-sm mt-0.5">{session?.user?.name}</p>
              <p className="text-xs text-muted-foreground">{(session?.user as any)?.dong}</p>
            </div>

            {/* 메뉴 항목 */}
            <div className="flex-1 overflow-y-auto py-2 px-3 space-y-0.5">
              {navItems.map(({ href, label, icon: Icon }) => {
                const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setDrawerOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {label}
                  </Link>
                )
              })}
            </div>

            {/* 로그아웃 */}
            <div className="px-3 py-3 border-t">
              <button
                onClick={() => {
                  setDrawerOpen(false)
                  signOut({ callbackUrl: '/login' })
                }}
                className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors"
              >
                <LogOut className="h-5 w-5" />
                로그아웃
              </button>
            </div>
          </nav>
        </div>
      )}
    </>
  )
}
