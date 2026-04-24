'use client'

import { useEffect, useState } from 'react'
import { Bell, Send, Users, MapPin, User } from 'lucide-react'
import { Button } from '@/components/ui/button'

const DONGS = [
  '양동', '양3동', '농성1동', '농성2동', '광천동', '유덕동',
  '치평동', '상무1동', '상무2동', '화정1동', '화정2동',
  '화정3동', '화정4동', '서창동', '금호1동', '금호2동',
  '풍암동', '동천동',
]

export default function NotificationsPage() {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [targetType, setTargetType] = useState<'ALL' | 'DONG' | 'INDIVIDUAL'>('ALL')
  const [targetDong, setTargetDong] = useState('')
  const [targetPhone, setTargetPhone] = useState('')
  const [targetMemberId, setTargetMemberId] = useState('')
  const [searchResult, setSearchResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [logs, setLogs] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/admin/notifications').then(r => r.json()).then(d => setLogs(d.logs ?? []))
  }, [])

  async function searchMember() {
    if (!targetPhone.trim()) return
    const res = await fetch(`/api/coordinator/members?search=${encodeURIComponent(targetPhone)}`)
    const d = await res.json()
    const m = d.members?.[0]
    if (m) { setSearchResult(m); setTargetMemberId(m.id) }
    else { setSearchResult(null); setError('회원을 찾을 수 없습니다') }
  }

  async function handleSend() {
    setLoading(true)
    setError('')
    setSent(null)

    const payload: any = { title, body, targetType }
    if (targetType === 'DONG') payload.targetDong = targetDong
    if (targetType === 'INDIVIDUAL') payload.targetMemberId = targetMemberId

    const res = await fetch('/api/admin/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const d = await res.json()
    setLoading(false)

    if (!res.ok) { setError(d.error); return }
    setSent(d.sent)
    setTitle('')
    setBody('')

    // 브라우저 알림 (현재 탭)
    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/icons/icon-192.svg' })
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(perm => {
        if (perm === 'granted') new Notification(title, { body })
      })
    }

    fetch('/api/admin/notifications').then(r => r.json()).then(d => setLogs(d.logs ?? []))
  }

  const canSend = title && body && (
    targetType === 'ALL' ||
    (targetType === 'DONG' && targetDong) ||
    (targetType === 'INDIVIDUAL' && targetMemberId)
  )

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">푸시 알림</h1>

      <div className="bg-white border rounded-xl p-5 space-y-5">
        {/* 발송 대상 */}
        <div className="space-y-3">
          <label className="text-sm font-semibold">발송 대상</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: 'ALL', label: '전체 회원', icon: Users },
              { key: 'DONG', label: '동별', icon: MapPin },
              { key: 'INDIVIDUAL', label: '개인', icon: User },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTargetType(key as any)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-colors ${
                  targetType === key ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Icon className={`h-5 w-5 ${targetType === key ? 'text-blue-600' : 'text-gray-500'}`} />
                <span className={`text-xs font-medium ${targetType === key ? 'text-blue-700' : 'text-gray-600'}`}>
                  {label}
                </span>
              </button>
            ))}
          </div>

          {targetType === 'DONG' && (
            <select
              value={targetDong}
              onChange={e => setTargetDong(e.target.value)}
              className="w-full h-10 px-3 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">동을 선택하세요</option>
              {DONGS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          )}

          {targetType === 'INDIVIDUAL' && (
            <div className="flex gap-2">
              <input
                value={targetPhone}
                onChange={e => setTargetPhone(e.target.value)}
                placeholder="전화번호로 검색"
                className="flex-1 h-10 px-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button variant="outline" size="sm" onClick={searchMember}>검색</Button>
            </div>
          )}
          {searchResult && (
            <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
              ✓ {searchResult.name} ({searchResult.dong}) 선택됨
            </p>
          )}
        </div>

        {/* 알림 내용 */}
        <div className="space-y-3">
          <label className="text-sm font-semibold">알림 내용</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="알림 제목"
            maxLength={100}
            className="w-full h-10 px-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="알림 내용을 입력하세요"
            maxLength={500}
            rows={4}
            className="w-full px-3 py-2 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        {sent !== null && (
          <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg px-4 py-3">
            <Bell className="h-5 w-5" />
            {sent}명에게 알림을 발송했습니다
          </div>
        )}

        <Button onClick={handleSend} disabled={!canSend || loading} className="w-full h-12 gap-2">
          <Send className="h-5 w-5" />
          {loading ? '발송 중...' : '알림 발송'}
        </Button>
      </div>

      {/* 발송 이력 */}
      {logs.length > 0 && (
        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50">
            <h3 className="font-semibold text-sm">관리자 활동 로그</h3>
          </div>
          <div className="divide-y max-h-64 overflow-y-auto">
            {logs.map(log => {
              const ACTION_LABEL: Record<string, string> = {
                TC_ALLOCATE: 'TC 개별 배분',
                BULK_ALLOCATE: 'TC 일괄 배분',
                TRANSACTION_DELETE: '거래 삭제',
                TRANSACTION_EDIT: '거래 수정',
              }
              return (
                <div key={log.id} className="px-4 py-3 text-sm flex justify-between items-start">
                  <div>
                    <span className="font-medium">{ACTION_LABEL[log.action] ?? log.action}</span>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(log.createdAt).toLocaleString('ko-KR')}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
