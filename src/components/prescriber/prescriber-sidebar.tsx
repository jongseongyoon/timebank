'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Stethoscope, FilePlus2, ListChecks } from 'lucide-react'

const navItems = [
  { href: '/prescriber',      label: '처방 발급',    icon: FilePlus2 },
  { href: '/prescriber/list', label: '내 처방 목록', icon: ListChecks },
]

export function PrescriberSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex flex-col w-60 min-h-screen bg-white border-r">
      <div className="flex items-center gap-2 px-6 py-5 border-b">
        <div className="bg-teal-600 rounded-full p-1.5">
          <Stethoscope className="h-5 w-5 text-white" aria-hidden="true" />
        </div>
        <div>
          <span className="font-bold text-lg block leading-tight">TimePay</span>
          <span className="text-xs text-muted-foreground">처방자</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1" aria-label="처방자 메뉴">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
              pathname === href
                ? 'bg-teal-50 text-teal-700'
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
