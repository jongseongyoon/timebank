export const dynamic = 'force-dynamic'
import { SessionProvider } from 'next-auth/react'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { PrescriberSidebar } from '@/components/prescriber/prescriber-sidebar'
import { Header } from '@/components/layout/header'

export default async function PrescriberLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  const allowed = session.user.roles.some((r) => ['PRESCRIBER', 'ADMIN'].includes(r))
  if (!allowed) redirect('/')

  return (
    <SessionProvider session={session}>
      <div className="flex min-h-screen bg-gray-50">
        <PrescriberSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </SessionProvider>
  )
}
