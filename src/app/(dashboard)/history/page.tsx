'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react'
import { formatDate, maskName } from '@/lib/utils'

const TX_STATUS_VARIANT: Record<string, any> = {
  PENDING: 'warning', APPROVED: 'success', CANCELLED: 'outline',
  DISPUTED: 'destructive', RESOLVED: 'default',
}
const TX_STATUS_LABEL: Record<string, string> = {
  PENDING: '승인 대기', APPROVED: '완료', CANCELLED: '취소', DISPUTED: '분쟁', RESOLVED: '해결',
}
const SERVICE_LABEL: Record<string, string> = {
  TRANSPORT: '이동지원', SHOPPING: '장보기', COMPANION: '말벗',
  MEAL: '식사지원', HOUSEKEEPING: '가사지원', MEDICAL_ESCORT: '의료동행',
  EDUCATION: '교육', DIGITAL_HELP: '디지털지원', REPAIR: '수리',
  CHILDCARE: '아이돌봄', LEGAL_CONSULT: '법률상담', HEALTH_CONSULT: '건강상담',
  ADMINISTRATIVE: '행정보조', COMMUNITY_EVENT: '공동체행사', OTHER: '기타',
}

export default function HistoryPage() {
  const [memberId, setMemberId] = useState('')
  const [txs, setTxs] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    fetch('/api/members/me').then((r) => r.json()).then((d) => setMemberId(d.member?.id))
  }, [])

  useEffect(() => {
    if (!memberId) return
    setLoading(true)
    fetch(`/api/transactions?page=1&limit=20`).then((r) => r.json()).then((d) => {
      setTxs(d.transactions ?? [])
      setTotal(d.total ?? 0)
      setLoading(false)
    })
  }, [memberId])

  async function loadMore() {
    setLoadingMore(true)
    const next = page + 1
    const res = await fetch(`/api/transactions?page=${next}&limit=20`)
    const d = await res.json()
    setTxs((prev) => [...prev, ...(d.transactions ?? [])])
    setPage(next)
    setLoadingMore(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">거래 내역</h1>
        <span className="text-sm text-muted-foreground">총 {total}건</span>
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="불러오는 중" />
        </div>
      )}

      <Card>
        <CardContent className="pt-4 divide-y">
          {!loading && txs.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">거래 내역이 없습니다.</p>
          )}
          {txs.map((tx) => {
            const isProvider = tx.provider?.id === memberId
            const counterpart = isProvider ? tx.receiver?.name : tx.provider?.name
            const tcChange = isProvider ? `+${Number(tx.tcAmount).toFixed(2)}` : `-${Number(tx.tcAmount).toFixed(2)}`

            return (
              <div key={tx.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isProvider ? 'bg-green-100' : 'bg-red-100'}`}>
                    {isProvider
                      ? <TrendingUp className="h-4 w-4 text-green-600" aria-hidden="true" />
                      : <TrendingDown className="h-4 w-4 text-red-600" aria-hidden="true" />
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {counterpart ? maskName(counterpart) : '시스템'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tx.serviceListing ? SERVICE_LABEL[tx.serviceListing.category] : '기타'} · {formatDate(tx.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-sm font-bold ${isProvider ? 'text-green-600' : 'text-red-600'}`}>
                    {tcChange} TC
                  </span>
                  <Badge variant={TX_STATUS_VARIANT[tx.status]}>
                    {TX_STATUS_LABEL[tx.status]}
                  </Badge>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {txs.length < total && (
        <Button variant="outline" className="w-full" onClick={loadMore} disabled={loadingMore}>
          {loadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
          더 보기
        </Button>
      )}
    </div>
  )
}
