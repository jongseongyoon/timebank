'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import { Loader2, UserCheck, AlertTriangle, Clock, CheckCircle } from 'lucide-react'

const URGENCY_VARIANT: Record<string, any> = {
  EMERGENCY: 'destructive', URGENT: 'warning', NORMAL: 'secondary',
}
const URGENCY_LABEL: Record<string, string> = {
  EMERGENCY: '응급', URGENT: '긴급', NORMAL: '일반',
}
const SERVICE_LABEL: Record<string, string> = {
  TRANSPORT: '이동지원', SHOPPING: '장보기', COMPANION: '말벗',
  MEAL: '식사지원', HOUSEKEEPING: '가사지원', MEDICAL_ESCORT: '의료동행',
  EDUCATION: '교육', DIGITAL_HELP: '디지털지원', REPAIR: '수리',
  CHILDCARE: '아이돌봄', LEGAL_CONSULT: '법률상담', HEALTH_CONSULT: '건강상담',
  ADMINISTRATIVE: '행정보조', COMMUNITY_EVENT: '공동체행사', OTHER: '기타',
}

export default function MatchingPage() {
  const [requests, setRequests] = useState<any[]>([])
  const [providers, setProviders] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [matching, setMatching] = useState<string | null>(null)
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/coordinator/requests?status=OPEN').then((r) => r.json()),
      fetch('/api/coordinator/members?role=PROVIDER').then((r) => r.json()),
    ]).then(([rData, mData]) => {
      setRequests(rData.requests ?? [])
      setProviders(mData.members ?? [])
      setLoading(false)
    })
  }, [])

  async function handleMatch(requestId: string, providerId: string) {
    setMatching(providerId)
    const res = await fetch(`/api/coordinator/requests/${requestId}/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ providerId }),
    })
    if (res.ok) {
      setDoneIds((prev) => new Set(Array.from(prev).concat(requestId)))
      setSelected(null)
    }
    setMatching(null)
  }

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="불러오는 중" />
    </div>
  )

  const openRequests = requests.filter((r) => !doneIds.has(r.id))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">매칭 관리</h1>
        <span className="text-sm text-muted-foreground">미매칭 요청 {openRequests.length}건</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-10rem)]">
        {/* 좌: 미매칭 요청 목록 */}
        <Card className="flex flex-col overflow-hidden">
          <CardHeader className="pb-3 shrink-0">
            <CardTitle className="text-base">대기 요청</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-2 pr-2">
            {openRequests.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
                <CheckCircle className="h-10 w-10 text-green-400" />
                <p className="text-sm">모든 요청이 처리되었습니다</p>
              </div>
            )}
            {openRequests.map((req) => (
              <button
                key={req.id}
                onClick={() => setSelected(selected?.id === req.id ? null : req)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selected?.id === req.id
                    ? 'border-primary bg-primary/5'
                    : req.urgency === 'EMERGENCY'
                    ? 'border-red-200 bg-red-50 hover:bg-red-100'
                    : req.urgency === 'URGENT'
                    ? 'border-amber-200 bg-amber-50 hover:bg-amber-100'
                    : 'border-input hover:bg-accent'
                }`}
                aria-pressed={selected?.id === req.id}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{req.requester.name}</span>
                      {req.requester.isVulnerable && (
                        <Badge variant="warning" className="text-xs">취약계층</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {SERVICE_LABEL[req.category]} · {req.durationMinutes}분
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(req.requestedDate)} · {req.dong}
                    </p>
                    {req.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{req.description}</p>
                    )}
                  </div>
                  <Badge variant={URGENCY_VARIANT[req.urgency]} className="shrink-0">
                    {req.urgency === 'EMERGENCY' && <AlertTriangle className="h-3 w-3 mr-1" aria-hidden="true" />}
                    {req.urgency === 'URGENT' && <Clock className="h-3 w-3 mr-1" aria-hidden="true" />}
                    {URGENCY_LABEL[req.urgency]}
                  </Badge>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* 우: 제공자 목록 / 선택 안내 */}
        <Card className="flex flex-col overflow-hidden">
          <CardHeader className="pb-3 shrink-0">
            <CardTitle className="text-base">
              {selected ? `제공자 선택 — ${SERVICE_LABEL[selected.category]}` : '왼쪽에서 요청을 선택하세요'}
            </CardTitle>
            {selected && (
              <p className="text-xs text-muted-foreground">
                {selected.requester.name} · {selected.durationMinutes}분 · {formatDate(selected.requestedDate)}
              </p>
            )}
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-2 pr-2">
            {!selected && (
              <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
                <UserCheck className="h-10 w-10 opacity-30" />
                <p className="text-sm">요청을 선택하면 가능한 제공자가 표시됩니다</p>
              </div>
            )}
            {selected && providers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">담당 동에 제공자가 없습니다.</p>
            )}
            {selected && providers.map((provider) => (
              <div key={provider.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{provider.name}</p>
                  <p className="text-xs text-muted-foreground">
                    잔액 {Number(provider.tcBalance).toFixed(1)} TC
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleMatch(selected.id, provider.id)}
                  disabled={matching === provider.id}
                  aria-label={`${provider.name}에게 매칭`}
                >
                  {matching === provider.id
                    ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    : '매칭 연결'
                  }
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
