'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Landmark, BarChart3, Settings, Coins, Building2,
  Gift, FileSpreadsheet, Bell, Trash2,
} from 'lucide-react'

const navItems = [
  { href: '/admin', label: '대시보드', icon: LayoutDashboard },
  { href: '/admin/tc', label: 'TC 관리', icon: Coins },
  { href: '/admin/allocate', label: 'TC 배분', icon: Gift },
  { href: '/admin/bulk-allocate', label: '엑셀 일괄 배분', icon: FileSpreadsheet },
  { href: '/admin/organizations', label: '단체 관리', icon: Building2 },
  { href: '/admin/fund', label: '기금 관리', icon: Landmark },
  { href: '/admin/reports', label: '보고서', icon: BarChart3 },
  { href: '/admin/notifications', label: '푸시 알림', icon: Bell },
  { href: '/admin/settings', label: '시스템 설정', icon: Settings },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex flex-col w-60 min-h-screen bg-white border-r">
      <div className="flex items-center gap-2 px-6 py-5 border-b">
        <div className="bg-slate-700 rounded-full p-1.5">
          <Coins className="h-5 w-5 text-white" aria-hidden="true" />
        </div>
        <div>
          <span className="font-bold text-lg block leading-tight">TimePay</span>
          <span className="text-xs text-muted-foreground">관리자</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1" aria-label="관리자 메뉴">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
              pathname === href
                ? 'bg-slate-100 text-slate-900'
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
