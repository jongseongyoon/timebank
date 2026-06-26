export const dynamic = 'force-dynamic'

import type { Metadata, Viewport } from 'next'
import Link from 'next/link'
import { SessionProvider } from 'next-auth/react'
import { ShieldAlert } from 'lucide-react'
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

  // 인증된 직원(ADMIN/COORDINATOR)만 (명령서 §4.1).
  // 권한이 없으면 홈으로 튕기지 않고, 이유를 알 수 있는 안내 화면을 보여준다.
  const allowed = (session.user.roles ?? []).some((r) =>
    (MONITORING_ROLES as readonly string[]).includes(r),
  )
  if (!allowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
        <div className="w-full max-w-sm rounded-2xl border bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
            <ShieldAlert className="h-7 w-7 text-amber-600" aria-hidden="true" />
          </div>
          <h1 className="text-lg font-bold">코디네이터 권한이 필요합니다</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            치매 모니터링 조회는 <b>코디네이터·관리자</b>만 볼 수 있습니다.
            <br />
            가입은 완료됐으니, <b>관리자에게 코디네이터 권한 부여</b>를 요청하세요.
          </p>
          <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
            {session.user.name}님 · 현재 권한: {(session.user.roles ?? []).join(', ') || '일반회원'}
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <Link
              href="/"
              className="rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
            >
              TimePay 홈으로
            </Link>
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-xs text-muted-foreground hover:text-foreground"
            >
              다른 계정으로 로그인
            </Link>
          </div>
        </div>
      </div>
    )
  }

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
