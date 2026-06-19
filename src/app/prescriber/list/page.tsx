'use client'

import { useEffect, useState, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

interface Rx {
  id: string
  prescriptionNo: string
  status: string
  careLevel: number
  totalTpGranted: string | number
  validFrom: string
  validUntil: string
  receiver:   { name: string; dong: string }
  coordinator: { name: string } | null
}

const STATUS_LABEL: Record<string, string> = { PENDING: '대기', ACTIVE: '활성', EXPIRED: '만료', CANCELLED: '취소' }
const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800', ACTIVE: 'bg-green-100 text-green-800',
  EXPIRED: 'bg-gray-100 text-gray-600', CANCELLED: 'bg-red-100 text-red-700',
}
function fmt(d: string) { return new Date(d).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' }) }

export default function PrescriberListPage() {
  const [items, setItems]     = useState<Rx[]>([])
  const [status, setStatus]   = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (s: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/social-prescription?page=1${s ? `&status=${s}` : ''}`)
      const d   = await res.json()
      setItems(d.items ?? [])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load(status) }, [load, status])

  const TABS = [
    { v: '',          l: '전체' },
    { v: 'PENDING',   l: '대기' },
    { v: 'ACTIVE',    l: '활성' },
    { v: 'EXPIRED',   l: '만료' },
    { v: 'CANCELLED', l: '취소' },
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold">내 처방 목록</h1>
        <p className="text-sm text-muted-foreground mt-0.5">내가 발급한 처방전의 상태를 확인합니다</p>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {TABS.map(t => (
          <button key={t.v} onClick={() => setStatus(t.v)}
            className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors
              ${status === t.v ? 'bg-white shadow text-teal-700' : 'text-gray-500'}`}>
            {t.l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">발급한 처방전이 없습니다.</div>
      ) : (
        <div className="space-y-3">
          {items.map(rx => (
            <Card key={rx.id}>
              <CardContent className="py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-gray-500">{rx.prescriptionNo}</span>
                      <Badge className={`text-xs ${STATUS_COLOR[rx.status] ?? 'bg-gray-100'}`}>
                        {STATUS_LABEL[rx.status] ?? rx.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs">돌봄 {rx.careLevel}등급</Badge>
                    </div>
                    <p className="font-semibold text-sm">
                      {rx.receiver.name} <span className="font-normal text-gray-500">({rx.receiver.dong})</span>
                    </p>
                    <p className="text-xs text-gray-400">
                      {fmt(rx.validFrom)} ~ {fmt(rx.validUntil)}
                      {rx.coordinator && ` · 승인: ${rx.coordinator.name}`}
                    </p>
                  </div>
                  <p className="text-base font-bold text-teal-700 shrink-0">{Number(rx.totalTpGranted)} TP</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
