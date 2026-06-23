'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, AlertTriangle } from 'lucide-react'

interface Stats {
  total: number
  pendingHelp: number
  statusMap: Record<string, number>
  dongs: { dong: string; total: number; done: number; pct: number }[]
}

const STATUS_META: { key: string; label: string; color: string }[] = [
  { key: 'NOT_STARTED', label: '미시작 (영상 안 본 가게)',    color: 'text-gray-500' },
  { key: 'VIDEO_SENT',  label: '영상 발송됨',                  color: 'text-blue-600' },
  { key: 'FIRST_USE',   label: '첫거래 완료',                  color: 'text-teal-600' },
  { key: 'ACTIVE',      label: '정상 운영 중 (거래 3건 이상)', color: 'text-green-600' },
  { key: 'NEEDS_HELP',  label: '도움 요청',                    color: 'text-red-600' },
]

export default function StoreOnboardingPage() {
  const [stats, setStats]   = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const res  = await fetch('/api/admin/store-onboarding')
      const data = await res.json()
      setStats(data)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  if (loading) return (
    <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
  )
  if (!stats) return null

  const notStarted = stats.statusMap['NOT_STARTED'] ?? 0

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">착한가게 온보딩 현황</h1>
        <p className="text-sm text-muted-foreground mt-1">전체 {stats.total}개 가게의 온보딩 진행 상황</p>
      </div>

      {/* 전체 요약 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {STATUS_META.map(m => (
          <Card key={m.key}>
            <CardContent className="py-3">
              <p className={`text-2xl font-bold ${m.color}`}>
                {stats.statusMap[m.key] ?? 0}
                <span className="text-sm font-normal text-gray-400 ml-1">개</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">{m.label}</p>
            </CardContent>
          </Card>
        ))}
        {stats.pendingHelp > 0 && (
          <Card className="border-red-200 bg-red-50 col-span-2 md:col-span-1">
            <CardContent className="py-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <p className="text-2xl font-bold text-red-600">
                  {stats.pendingHelp}
                  <span className="text-sm font-normal text-red-400 ml-1">건</span>
                </p>
              </div>
              <p className="text-xs text-red-500 mt-1">처리 대기 도움 요청</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 전체 진행률 */}
      <Card>
        <CardContent className="py-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium">전체 온보딩 완료율</span>
            <span className="text-gray-500">
              {(stats.statusMap['FIRST_USE'] ?? 0) + (stats.statusMap['ACTIVE'] ?? 0)} / {stats.total}
            </span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-500 rounded-full transition-all"
              style={{ width: `${stats.total > 0 ? (((stats.statusMap['FIRST_USE'] ?? 0) + (stats.statusMap['ACTIVE'] ?? 0)) / stats.total * 100) : 0}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* 동별 현황 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">동별 온보딩 진행률</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {stats.dongs.map(d => (
            <div key={d.dong}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">{d.dong}</span>
                <span className="text-gray-500 text-xs">{d.done}/{d.total} ({d.pct}%)</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-400 rounded-full"
                  style={{ width: `${d.pct}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 미시작 일괄 알림 */}
      {notStarted > 0 && (
        <Card className="border-orange-200">
          <CardContent className="py-4">
            <p className="text-sm font-semibold mb-1">미시작 가게 일괄 안내 발송</p>
            <p className="text-xs text-gray-500 mb-3">
              아직 온보딩을 시작하지 않은 {notStarted}개 가게에 안내 문자를 재발송할 수 있습니다.
            </p>
            <Button variant="outline" className="gap-2" onClick={() => alert('문자 발송 기능은 SMS 연동 후 활성화됩니다.')}>
              📱 전체 미시작 가게에 안내 문자 재발송
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={load}>새로고침</Button>
      </div>
    </div>
  )
}
