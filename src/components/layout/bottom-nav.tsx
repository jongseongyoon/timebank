'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

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
  {
    href: '/scan',
    label: 'QR',
    icon: (_active: boolean) => (
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

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white border-t border-gray-200 safe-area-bottom">
      <div className="flex items-end justify-around h-16 px-2">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-end gap-0.5 flex-1 pb-2 min-h-[48px]"
              aria-current={active ? 'page' : undefined}
            >
              {icon(active)}
              {href !== '/scan' && (
                <span
                  className="text-[10px] font-medium"
                  style={{ color: active ? '#3b5bdb' : '#9ca3af' }}
                >
                  {label}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
