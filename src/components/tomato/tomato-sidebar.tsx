'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Users, Upload, ShoppingCart, BellRing, ScanLine, Tags, Stethoscope,
} from 'lucide-react'

// 토마토의료기 회원·포인트 관리 메뉴.
// ready: 구현 완료된 화면 / 그 외는 후속 Phase 예정(비활성 표시)
type NavItem = { href: string; label: string; icon: any; ready?: boolean; phase?: number }

const navItems: NavItem[] = [
  { href: '/tomato', label: '대시보드', icon: LayoutDashboard, ready: true },
  { href: '/tomato/members', label: '회원 관리', icon: Users, ready: true },
  { href: '/tomato/categories', label: '제품 카테고리', icon: Tags, ready: true },
  { href: '/tomato/import', label: '엑셀 일괄등록', icon: Upload, ready: true },
  { href: '/tomato/purchases/new', label: '구매 등록', icon: ShoppingCart, phase: 3 },
  { href: '/tomato/alerts', label: '관리기한 알림', icon: BellRing, phase: 3 },
  { href: '/tomato/scan', label: 'QR 스캔', icon: ScanLine, phase: 5 },
]

export function TomatoSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex flex-col w-60 min-h-screen bg-white border-r">
      <div className="flex items-center gap-2 px-6 py-5 border-b">
        <div className="bg-red-600 rounded-full p-1.5">
          <Stethoscope className="h-5 w-5 text-white" aria-hidden="true" />
        </div>
        <div>
          <span className="font-bold text-lg block leading-tight">토마토의료기</span>
          <span className="text-xs text-muted-foreground">회원·포인트 관리</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="토마토의료기 메뉴">
        {navItems.map(({ href, label, icon: Icon, ready, phase }) => {
          const active = pathname === href
          if (!ready) {
            // 아직 구현되지 않은 화면은 비활성(클릭 불가)으로 표시
            return (
              <div
                key={href}
                className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-gray-300 cursor-not-allowed select-none"
                aria-disabled="true"
                title={`Phase ${phase}에서 제공 예정`}
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {label}
                </span>
                <span className="text-[10px] font-semibold text-gray-300 border border-gray-200 rounded px-1.5 py-0.5">
                  P{phase}
                </span>
              </div>
            )
          }
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                active
                  ? 'bg-red-50 text-red-700'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-4 py-3 border-t">
        <Link href="/" className="text-xs text-muted-foreground hover:text-foreground">
          ← TimePay 메인으로
        </Link>
      </div>
    </aside>
  )
}
