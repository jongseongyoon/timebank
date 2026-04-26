'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Notification = {
  id: string
  createdAt: string
  type: string
  title: string
  body: string
  isRead: boolean
  link: string | null
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const res = await fetch('/api/notifications')
    const d = await res.json()
    setNotifications(d.notifications ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function markAllRead() {
    await fetch('/api/notifications?all=true', { method: 'PATCH' })
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
  }

  async function markRead(id: string) {
    await fetch(`/api/notifications?id=${id}`, { method: 'PATCH' })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">알림</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-muted-foreground mt-0.5">읽지 않은 알림 {unreadCount}개</p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead} className="gap-1.5">
            <CheckCheck className="h-4 w-4" />
            모두 읽음
          </Button>
        )}
      </div>

      {/* 알림 목록 */}
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
          <BellOff className="h-12 w-12 opacity-30" />
          <p className="text-sm">아직 알림이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div
              key={n.id}
              onClick={() => { if (!n.isRead) markRead(n.id) }}
              className={`rounded-2xl p-4 border transition-colors cursor-pointer ${
                n.isRead
                  ? 'bg-white text-gray-600 border-gray-100'
                  : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  n.isRead ? 'bg-gray-100' : 'bg-blue-600'
                }`}>
                  <Bell className={`h-4 w-4 ${n.isRead ? 'text-gray-400' : 'text-white'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-semibold truncate ${n.isRead ? 'text-gray-700' : 'text-blue-900'}`}>
                      {n.title}
                    </p>
                    {!n.isRead && (
                      <span className="w-2 h-2 bg-blue-600 rounded-full shrink-0" />
                    )}
                  </div>
                  <p className={`text-xs mt-0.5 leading-relaxed ${n.isRead ? 'text-gray-500' : 'text-blue-700'}`}>
                    {n.body}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {new Date(n.createdAt).toLocaleString('ko-KR', {
                      month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
