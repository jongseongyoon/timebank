'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, GitMerge, CheckSquare, Users,
  ClipboardList, Coins, PenLine, HeartHandshake,
} from 'lucide-react'

const navItems = [
  { href: '/coordinator', label: '대시보드', icon: LayoutDashboard },
  { href: '/coordinator/care-packages', label: '돌봄 패키지', icon: HeartHandshake },
  { href: '/coordinator/record', label: '거래 직접 입력', icon: PenLine },
  { href: '/coordinator/matching', label: '매칭 관리', icon: GitMerge },
  { href: '/coordinator/approval', label: '거래 승인', icon: CheckSquare },
  { href: '/coordinator/members', label: '회원 관리', icon: Users },
  { href: '/coordinator/offline-sync', label: '오프라인 등록', icon: ClipboardList },
]

export function CoordSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex flex-col w-60 min-h-screen bg-white border-r">
      <div className="flex items-center gap-2 px-6 py-5 border-b">
        <div className="bg-indigo-600 rounded-full p-1.5">
          <Coins className="h-5 w-5 text-white" aria-hidden="true" />
        </div>
        <div>
          <span className="font-bold text-lg block leading-tight">타임뱅크</span>
          <span className="text-xs text-muted-foreground">코디네이터</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1" aria-label="코디네이터 메뉴">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
              pathname === href
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
            aria-current={pathname === href ? 'page' : undefined}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="px-4 py-3 border-t">
        <Link href="/" className="text-xs text-muted-foreground hover:text-foreground">
          ← 일반 회원 화면
        </Link>
      </div>
    </aside>
  )
}
