'use client'

import { signOut, useSession } from 'next-auth/react'
import { Bell, LogOut, User, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Header() {
  const { data: session } = useSession()

  return (
    <header className="h-14 border-b bg-white flex items-center justify-between px-4 md:px-6">
      <button className="md:hidden p-2 rounded-md hover:bg-accent" aria-label="메뉴 열기">
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden md:block" />

      <div className="flex items-center gap-2">
        <button
          className="p-2 rounded-md hover:bg-accent relative"
          aria-label="알림"
        >
          <Bell className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 pl-2 border-l">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-4 w-4 text-primary" aria-hidden="true" />
          </div>
          <span className="hidden md:block text-sm font-medium">{session?.user.name}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => signOut({ callbackUrl: '/login' })}
            aria-label="로그아웃"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
