export const dynamic = 'force-dynamic'
import type { Metadata, Viewport } from 'next'
import Link from 'next/link'
import { SessionProvider } from 'next-auth/react'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { Gift } from 'lucide-react'
import { CouponNav } from '@/components/coupon/coupon-nav'

export const metadata: Metadata = {
  title: '착한쿠폰 - 광주서구',
  description: '착한가게에서 사용하는 착한쿠폰 전용 앱',
  manifest: '/coupon-manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: '착한쿠폰' },
  icons: {
    icon: [
      { url: '/icons/coupon-icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/coupon-icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/coupon-apple-touch.png', sizes: '180x180', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  themeColor: '#ea580c',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default async function CouponLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login?callbackUrl=/coupon')

  const store = await prisma.goodStore.findFirst({
    where: { memberId: session.user.id, status: { not: 'SUSPENDED' } },
    select: { id: true },
  })

  return (
    <SessionProvider session={session}>
      <div className="min-h-screen bg-orange-50/40">
        {/* 헤더 */}
        <header className="sticky top-0 z-30 bg-orange-600 text-white">
          <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-3">
            <Link href="/coupon" className="flex items-center gap-2">
              <Gift className="h-6 w-6" aria-hidden="true" />
              <span className="font-bold text-lg">착한쿠폰</span>
            </Link>
            <Link href="/" className="text-xs text-orange-100 hover:text-white underline">
              TimePay 전체 앱
            </Link>
          </div>
        </header>

        <main className="max-w-lg mx-auto px-4 py-5 pb-24">{children}</main>
      </div>
      <CouponNav isStoreOwner={!!store} />
    </SessionProvider>
  )
}
