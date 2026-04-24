import { SessionProvider } from 'next-auth/react'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { CoordSidebar } from '@/components/coordinator/coord-sidebar'
import { Header } from '@/components/layout/header'

export default async function CoordinatorLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  const isCoordinator = session.user.roles.some((r) => ['COORDINATOR', 'ADMIN'].includes(r))
  if (!isCoordinator) redirect('/')

  return (
    <SessionProvider session={session}>
      <div className="flex min-h-screen bg-gray-50">
        <CoordSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </SessionProvider>
  )
}
