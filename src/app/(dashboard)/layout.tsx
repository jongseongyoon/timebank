export const dynamic = 'force-dynamic'
import { SessionProvider } from 'next-auth/react'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { BottomNav } from '@/components/layout/bottom-nav'
import { SplashScreen } from '@/components/pwa/splash-screen'
import { InstallBanner } from '@/components/pwa/install-banner'
import { RatingModal } from '@/components/rating/rating-modal'

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
          {/* 하단 네비 공간 확보: 모바일에서 pb-16 */}
          <main className="flex-1 p-4 pb-20 md:p-6 md:pb-6">{children}</main>
        </div>
      </div>
      <BottomNav />
      <InstallBanner />
      <RatingModal memberId={session.user.id} />
    </SessionProvider>
  )
}
