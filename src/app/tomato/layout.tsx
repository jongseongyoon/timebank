export const dynamic = 'force-dynamic'
import type { Metadata, Viewport } from 'next'
import { SessionProvider } from 'next-auth/react'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { TomatoSidebar } from '@/components/tomato/tomato-sidebar'
import { Header } from '@/components/layout/header'

// 토마토의료기 전용 PWA — 홈 화면에 "토마토의료기"로 독립 설치
const TOMATO_BASE = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://timebank-mocha.vercel.app'

export const metadata: Metadata = {
  title: '토마토의료기 회원·포인트 관리',
  description: '토마토의료기 회원·포인트·관리기한 관리 시스템',
  manifest: '/tomato-manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: '토마토의료기' },
  icons: {
    icon: [
      { url: '/icons/tomato-icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/tomato-icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/tomato-apple-touch.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: '토마토의료기 회원·포인트 관리',
    description: '토마토의료기 회원·포인트·관리기한 관리 시스템',
    siteName: '토마토의료기',
    type: 'website',
    locale: 'ko_KR',
    url: `${TOMATO_BASE}/tomato`,
    images: [{ url: `${TOMATO_BASE}/icons/tomato-og.png`, width: 1200, height: 630, alt: '토마토의료기' }],
  },
}

export const viewport: Viewport = {
  themeColor: '#dc2626',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

// 토마토의료기 관리 영역. 직원·관리자(ADMIN) 로그인 필요.
export default async function TomatoLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login?callbackUrl=/tomato')

  const isAdmin = session.user.roles.includes('ADMIN')
  if (!isAdmin) redirect('/')

  return (
    <SessionProvider session={session}>
      <div className="flex min-h-screen bg-gray-50">
        <TomatoSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </SessionProvider>
  )
}
