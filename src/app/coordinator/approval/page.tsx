'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDate } from '@/lib/utils'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

const SERVICE_LABEL: Record<string, string> = {
  TRANSPORT: '이동지원', SHOPPING: '장보기', COMPANION: '말벗',
  MEAL: '식사지원', HOUSEKEEPING: '가사지원', MEDICAL_ESCORT: '의료동행',
  EDUCATION: '교육', DIGITAL_HELP: '디지털지원', REPAIR: '수리',
  CHILDCARE: '아이돌봄', LEGAL_CONSULT: '법률상담', HEALTH_CONSULT: '건강상담',
  ADMINISTRATIVE: '행정보조', COMMUNITY_EVENT: '공동체행사', OTHER: '기타',
}

function TxList({ status }: { status: string }) {
  const [txs, setTxs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/coordinator/pending-transactions?status=${status}`)
      .then((r) => r.json())
      .then((d) => { setTxs(d.transactions ?? []); setLoading(false) })
  }, [status])

  async function handleAction(id: string, action: 'approve' | 'cancel') {
    setActing(id)
    const res = await fetch(`/api/transactions/${id}/${action}`, { method: 'PATCH' })
    if (res.ok) setTxs((prev) => prev.filter((t) => t.id !== id))
    setActing(null)
  }

  if (loading) return (
    <div className="flex justify-center py-8">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="불러오는 중" />
    </div>
  )

  return (
    <Card>
      <CardContent className="pt-4 divide-y">
        {txs.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            {status === 'PENDING' ? '승인 대기 중인 거래가 없습니다.' : '내역이 없습니다.'}
          </p>
        )}
        {txs.map((tx) => (
          <div key={tx.id} className="py-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold">
                    {tx.provider?.name ?? '시스템'} → {tx.receiver?.name ?? '시스템'}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {tx.serviceListing ? SERVICE_LABEL[tx.serviceListing.category] : tx.txType}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {tx.durationMinutes}분 · {tx.verificationMethod} · {formatDate(tx.createdAt)}
                </p>
                {tx.note && (
                  <p className="text-xs text-muted-foreground mt-1 bg-muted px-2 py-1 rounded">
                    비고: {tx.note}
                  </p>
                )}
              </div>
              <span className="text-base font-bold text-blue-600 shrink-0">
                {Number(tx.tcAmount).toFixed(2)} TC
              </span>
            </div>

            {status === 'PENDING' && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => handleAction(tx.id, 'approve')}
                  disabled={acting === tx.id}
                  aria-label="거래 승인"
                >
                  {acting === tx.id
                    ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    : <><CheckCircle className="h-4 w-4 mr-1" aria-hidden="true" />승인</>
                  }
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-destructive hover:text-destructive"
                  onClick={() => handleAction(tx.id, 'cancel')}
                  disabled={acting === tx.id}
                  aria-label="거래 취소"
                >
                  <XCircle className="h-4 w-4 mr-1" aria-hidden="true" />취소
                </Button>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export default function ApprovalPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">거래 승인</h1>
      <Tabs defaultValue="PENDING">
        <TabsList>
          <TabsTrigger value="PENDING">승인 대기</TabsTrigger>
          <TabsTrigger value="APPROVED">승인 완료</TabsTrigger>
          <TabsTrigger value="CANCELLED">취소됨</TabsTrigger>
        </TabsList>
        <TabsContent value="PENDING"><TxList status="PENDING" /></TabsContent>
        <TabsContent value="APPROVED"><TxList status="APPROVED" /></TabsContent>
        <TabsContent value="CANCELLED"><TxList status="CANCELLED" /></TabsContent>
      </Tabs>
    </div>
  )
}
