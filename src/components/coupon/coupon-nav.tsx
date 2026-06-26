'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Home, ScanLine, Store } from 'lucide-react'

export function CouponNav({ isStoreOwner }: { isStoreOwner: boolean }) {
  const pathname = usePathname()

  const items = [
    { href: '/coupon', label: '홈', icon: Home },
    { href: '/coupon/scan', label: '착한가게 결제', icon: ScanLine },
    ...(isStoreOwner ? [{ href: '/coupon/store', label: '우리가게 QR', icon: Store }] : []),
  ]

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-orange-100 md:hidden" aria-label="착한쿠폰 메뉴">
      <div className="flex">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors',
                active ? 'text-orange-600' : 'text-gray-400 hover:text-gray-600',
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
