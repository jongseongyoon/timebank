'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Wallet, ArrowLeftRight, ClipboardList,
  PlusCircle, User, Coins, ListChecks, Search,
} from 'lucide-react'

const navItems = [
  { href: '/', label: '대시보드', icon: LayoutDashboard },
  { href: '/wallet', label: 'TC 지갑', icon: Wallet },
  { href: '/history', label: '거래 내역', icon: ArrowLeftRight },
  { href: '/services/browse', label: '서비스 찾기', icon: Search },
  { href: '/services/request', label: '서비스 요청', icon: ClipboardList },
  { href: '/services/my-requests', label: '내 요청 목록', icon: ListChecks },
  { href: '/services/register', label: '서비스 등록', icon: PlusCircle },
  { href: '/profile', label: '내 정보', icon: User },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex flex-col w-60 min-h-screen bg-white border-r">
      <div className="flex items-center gap-2 px-6 py-5 border-b">
        <div className="bg-primary rounded-full p-1.5">
          <Coins className="h-5 w-5 text-white" aria-hidden="true" />
        </div>
        <span className="font-bold text-lg">타임뱅크</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1" aria-label="주 메뉴">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
              pathname === href
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
            aria-current={pathname === href ? 'page' : undefined}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
