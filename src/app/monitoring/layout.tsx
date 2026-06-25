export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { SessionProvider } from 'next-auth/react'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { MONITORING_ROLES } from '@/lib/dementia/access'
import { IdleLogout } from '@/components/monitoring/idle-logout'
import { MonitoringNav } from '@/components/monitoring/monitoring-nav'

// 공개 금지 — 검색엔진 색인 차단 (명령서 §4.6)
export const metadata: Metadata = {
  title: '치매 모니터링 조회',
  robots: { index: false, follow: false, nocache: true },
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
