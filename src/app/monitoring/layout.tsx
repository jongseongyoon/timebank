export const dynamic = 'force-dynamic'

import type { Metadata, Viewport } from 'next'
import { SessionProvider } from 'next-auth/react'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { MONITORING_ROLES } from '@/lib/dementia/access'
import { IdleLogout } from '@/components/monitoring/idle-logout'
import { MonitoringNav } from '@/components/monitoring/monitoring-nav'

// 공개 금지 — 검색엔진 색인 차단 (명령서 §4.6) + PWA(홈화면 설치)
export const metadata: Metadata = {
  title: '치매 모니터링 조회',
  description: '치매 모니터링 상담 내역 조회 (내부 직원용)',
  robots: { index: false, follow: false, nocache: true },
  manifest: '/monitoring-manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: '모니터링' },
  icons: {
    icon: [
      { url: '/icons/monitoring-icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/monitoring-icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/monitoring-apple-touch.png', sizes: '180x180', type: 'image/png' }],
  },
}

export const viewport: Viewport = {
  themeColor: '#0d9488',
  width: 'device-width',
  initialScale: 1,
}

export default async function MonitoringLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect('/login?callbackUrl=/monitoring')

  // 인증된 직원(ADMIN/COORDINATOR)만 (명령서 §4.1)
  const allowed = (session.user.roles ?? []).some((r) =>
    (MONITORING_ROLES as readonly string[]).includes(r),
  )
  if (!allowed) redirect('/')

  return (
    <SessionProvider session={session}>
      <IdleLogout />
      <div className="min-h-screen bg-gray-50">
        <MonitoringNav userName={session.user.name ?? ''} />
        <main className="mx-auto w-full max-w-3xl px-4 py-4 md:py-6">{children}</main>
      </div>
    </SessionProvider>
  )
}
