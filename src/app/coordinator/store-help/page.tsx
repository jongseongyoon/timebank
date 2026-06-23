'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Phone, CheckCircle2 } from 'lucide-react'

interface HelpItem {
  id: string
  createdAt: string
  requestType: string
  status: string
  note: string | null
  store: { storeName: string; phone: string; dong: string }
  coordinator: { name: string } | null
}

const TYPE_LABEL: Record<string, string> = {
  VIDEO_UNCLEAR:  '영상 이해 안됨',
  CANNOT_SCAN:    'QR 스캔 안됨',
  PAYMENT_ISSUE:  '결제 오류',
  OTHER:          '기타',
}
const STATUS_COLOR: Record<string, string> = {
  PENDING:  'bg-yellow-100 text-yellow-800',
  CALLED:   'bg-blue-100 text-blue-800',
  RESOLVED: 'bg-green-100 text-green-800',
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 60000
  if (diff < 60) return `${Math.floor(diff)}분 전`
  if (diff < 1440) return `${Math.floor(diff / 60)}시간 전`
  return `${Math.floor(diff / 1440)}일 전`
}

export default function StoreHelpPage() {
  const [items, setItems]           = useState<HelpItem[]>([])
  const [loading, setLoading]       = useState(true)
  const [statusFilter, setStatus]   = useState('PENDING')
  const [busy, setBusy]             = useState<string | null>(null)

  const load = useCallback(async (s: string) => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/coordinator/store-help?status=${s}`)
      const data = await res.json()
      setItems(data.items ?? [])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load(statusFilter) }, [load, statusFilter])

  async function handle(id: string, action: 'call' | 'resolve') {
    setBusy(id)
    try {
      await fetch('/api/coordinator/store-help', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      })
      await load(statusFilter)
    } finally { setBusy(null) }
  }

  const TABS = [
    { v: 'PENDING',  l: '대기' },
    { v: 'CALLED',   l: '통화중' },
    { v: 'RESOLVED', l: '완료' },
    { v: 'all',      l: '전체' },
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold">착한가게 도움 요청</h1>
        <p className="text-sm text-muted-foreground mt-0.5">가게 사장님의 도움 요청을 처리합니다</p>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {TABS.map(t => (
          <button key={t.v} onClick={() => setStatus(t.v)}
            className={`px-3 py-1.5 text-xs rounded-md font-medium transition-colors
              ${statusFilter === t.v ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>
            {t.l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">요청이 없습니다.</div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <Card key={item.id}>
              <CardContent className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{item.store.storeName}</span>
                      <Badge className={`text-xs ${STATUS_COLOR[item.status] ?? 'bg-gray-100'}`}>
                        {item.status === 'PENDING' ? '대기' : item.status === 'CALLED' ? '통화중' : '완료'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500">
                      {TYPE_LABEL[item.requestType] ?? item.requestType} · {item.store.dong} · {timeAgo(item.createdAt)}
                    </p>
                    {item.coordinator && (
                      <p className="text-xs text-blue-600">담당: {item.coordinator.name}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5 shrink-0">
                    <Button size="sm" variant="outline" className="gap-1 text-xs" asChild>
                      <a href={`tel:${item.store.phone}`}>
                        <Phone className="h-3 w-3" />
                        {item.store.phone}
                      </a>
                    </Button>
                    {item.status !== 'RESOLVED' && (
                      <>
                        {item.status === 'PENDING' && (
                          <Button size="sm" variant="outline" className="text-xs gap-1"
                            disabled={busy === item.id}
                            onClick={() => handle(item.id, 'call')}>
                            {busy === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                            통화 중으로 변경
                          </Button>
                        )}
                        <Button size="sm" className="text-xs gap-1 bg-green-600 hover:bg-green-700 text-white"
                          disabled={busy === item.id}
                          onClick={() => handle(item.id, 'resolve')}>
                          {busy === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                          해결 완료
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
