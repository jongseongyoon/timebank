export const dynamic = 'force-dynamic'
import lazyImport from 'next/dynamic'
import { SessionProvider } from 'next-auth/react'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { BottomNav } from '@/components/layout/bottom-nav'

// ── 초기 번들에서 제외: 조건부로만 렌더되는 클라이언트 컴포넌트 ──────────────
// SplashScreen: PWA standalone 첫 실행에서만 1.5초 표시 → 나머지 상황엔 null
const SplashScreen = lazyImport(
  () => import('@/components/pwa/splash-screen').then(m => ({ default: m.SplashScreen })),
  { ssr: false, loading: () => null },
)
// InstallBanner: beforeinstallprompt 이벤트가 발생할 때만 렌더
const InstallBanner = lazyImport(
  () => import('@/components/pwa/install-banner').then(m => ({ default: m.InstallBanner })),
  { ssr: false, loading: () => null },
)
// RatingModal: 최근 24시간 내 미평가 거래가 있을 때만 팝업 표시
const RatingModal = lazyImport(
  () => import('@/components/rating/rating-modal').then(m => ({ default: m.RatingModal })),
  { ssr: false, loading: () => null },
)

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <SessionProvider session={session}>
      <SplashScreen />
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          {/* 하단 네비 공간 확보: 모바일에서 pb-20 */}
          <main className="flex-1 p-4 pb-20 md:p-6 md:pb-6">{children}</main>
        </div>
      </div>
      <BottomNav />
      <InstallBanner />
      <RatingModal memberId={session.user.id} />
    </SessionProvider>
  )
}
