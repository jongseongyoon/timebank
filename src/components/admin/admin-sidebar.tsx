'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Landmark, BarChart3, Settings, Coins, Building2,
  Gift, FileSpreadsheet, Bell, Vault, Sheet, TableProperties, Users,
  Store, ClipboardCheck, Receipt, ShieldCheck,
} from 'lucide-react'

// 화폐 종류(TP / 원화) 기준으로 묶은 그룹형 메뉴
const navGroups: { label?: string; items: { href: string; label: string; icon: any }[] }[] = [
  {
    items: [
      { href: '/admin', label: '대시보드', icon: LayoutDashboard },
      { href: '/admin/members', label: '회원 관리', icon: Users },
    ],
  },
  {
    label: 'TP (시간화폐)',
    items: [
      { href: '/admin/tc', label: 'TP 관리', icon: Coins },
      { href: '/admin/allocate', label: 'TP 개별배분', icon: Gift },
      { href: '/admin/bulk-allocate', label: '엑셀 일괄배분', icon: FileSpreadsheet },
    ],
  },
  {
    label: '원화 (착한쿠폰)',
    items: [
      { href: '/admin/coupons', label: '쿠폰 개별발급', icon: Gift },
      { href: '/admin/bulk-coupons', label: '엑셀 일괄발급', icon: FileSpreadsheet },
      { href: '/admin/settlements', label: '착한쿠폰 정산', icon: Receipt },
    ],
  },
  {
    label: '착한가게',
    items: [
      { href: '/admin/store-import', label: '착한가게 등록', icon: Store },
      { href: '/admin/store-onboarding', label: '착한가게 현황', icon: ClipboardCheck },
    ],
  },
  {
    label: '운영',
    items: [
      { href: '/admin/organizations', label: '단체 관리', icon: Building2 },
      { href: '/admin/sheet-setup', label: '시트 템플릿 설정', icon: TableProperties },
      { href: '/admin/sheet-import', label: '구글 시트 가져오기', icon: Sheet },
      { href: '/admin/fund', label: '기금 관리', icon: Landmark },
      { href: '/admin/funds', label: '재원 통합 현황', icon: Vault },
      { href: '/monitoring', label: '치매 모니터링 조회', icon: ShieldCheck },
      { href: '/admin/reports', label: '보고서', icon: BarChart3 },
      { href: '/admin/notifications', label: '푸시 알림', icon: Bell },
      { href: '/admin/settings', label: '시스템 설정', icon: Settings },
    ],
  },
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

      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto" aria-label="관리자 메뉴">
        {navGroups.map((group, gi) => (
          <div key={group.label ?? `g${gi}`} className="space-y-1">
            {group.label && (
              <p className="px-3 pt-1 pb-0.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                {group.label}
              </p>
            )}
            {group.items.map(({ href, label, icon: Icon }) => (
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
          </div>
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
