'use client'
/**
 * 모니터링 상단 네비게이션 (모바일 우선) — 명령서 §6
 */
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { Users, ListChecks, LogOut, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/monitoring', label: '인물 조회', icon: Users, exact: true },
  { href: '/monitoring/followups', label: '팔로업', icon: ListChecks, exact: false },
]

export function MonitoringNav({ userName }: { userName: string }) {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-30 border-b bg-white">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-teal-600 p-1.5">
            <ShieldCheck className="h-5 w-5 text-white" aria-hidden="true" />
          </div>
          <div className="leading-tight">
            <span className="block text-sm font-bold">치매 모니터링 조회</span>
            <span className="text-[11px] text-muted-foreground">내부용 · 읽기 전용</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-muted-foreground sm:inline">{userName}</span>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100"
            aria-label="로그아웃"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      <nav className="mx-auto flex w-full max-w-3xl gap-1 px-2" aria-label="모니터링 메뉴">
        {tabs.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'border-teal-600 text-teal-700'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
