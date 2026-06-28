export const dynamic = 'force-dynamic'
import { SessionProvider } from 'next-auth/react'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { TomatoSidebar } from '@/components/tomato/tomato-sidebar'
import { Header } from '@/components/layout/header'

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
