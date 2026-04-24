'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Download } from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  PieChart, Pie, Cell,
} from 'recharts'

const CATEGORY_COLORS = [
  '#6366f1', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#14b8a6',
]

const SERVICE_LABEL: Record<string, string> = {
  TRANSPORT: '이동지원', SHOPPING: '장보기', COMPANION: '말벗',
  MEAL: '식사지원', HOUSEKEEPING: '가사지원', MEDICAL_ESCORT: '의료동행',
  EDUCATION: '교육', DIGITAL_HELP: '디지털지원', REPAIR: '수리',
  CHILDCARE: '아이돌봄', LEGAL_CONSULT: '법률상담', HEALTH_CONSULT: '건강상담',
  ADMINISTRATIVE: '행정보조', COMMUNITY_EVENT: '공동체행사', OTHER: '기타',
}

interface OverviewData {
  totalMembers: number
  activeMembers: number
  totalTC: number
  monthlyTx: number
  approvedTx: number
  pendingTx: number
  cancelledTx: number
  vulnerableMembers: number
  providerCount: number
  receiverCount: number
}

interface TcFlowItem {
  category: string
  txCount: number
  totalTC: number
}

interface DongItem {
  dong: string
  members: number
  tcBalance: number
  providers: number
  receivers: number
}

export default function AdminReportsPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [tcFlow, setTcFlow] = useState<TcFlowItem[]>([])
  const [dongData, setDongData] = useState<DongItem[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [period, setPeriod] = useState('30')

  useEffect(() => {
    async function fetchAll() {
      setLoading(true)
      const [o, f, d] = await Promise.all([
        fetch(`/api/admin/reports/overview?days=${period}`).then((r) => r.json()),
        fetch(`/api/admin/reports/tc-flow?days=${period}`).then((r) => r.json()),
        fetch('/api/admin/reports/by-dong').then((r) => r.json()),
      ])
      setOverview(o)
      setTcFlow(f.data ?? [])
      setDongData(d.data ?? [])
      setLoading(false)
    }
    fetchAll()
  }, [period])

  async function handleExport() {
    setExporting(true)
    const res = await fetch(`/api/admin/reports/export?days=${period}`)
    if (res.ok) {
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `timebank-report-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    }
    setExporting(false)
  }

  const pieData = tcFlow
    .sort((a, b) => b.totalTC - a.totalTC)
    .slice(0, 8)
    .map((item) => ({
      name: SERVICE_LABEL[item.category] ?? item.category,
      value: Math.round(item.totalTC * 10) / 10,
    }))

  const barData = tcFlow.map((item) => ({
    name: SERVICE_LABEL[item.category] ?? item.category,
    거래수: item.txCount,
    TC량: Math.round(item.totalTC * 10) / 10,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">보고서</h1>
          <p className="text-muted-foreground text-sm mt-1">TC 흐름 통계 및 동별 현황</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            aria-label="기간 선택"
          >
            <option value="7">최근 7일</option>
            <option value="30">최근 30일</option>
            <option value="90">최근 90일</option>
            <option value="365">최근 1년</option>
          </select>
          <Button size="sm" variant="outline" onClick={handleExport} disabled={exporting}>
            {exporting
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <><Download className="h-4 w-4 mr-1" />CSV 내보내기</>
            }
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* 요약 지표 */}
          {overview && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: '활성 회원', value: `${overview.activeMembers}명`, sub: `전체 ${overview.totalMembers}명` },
                { label: '승인 거래', value: `${overview.approvedTx}건`, sub: `대기 ${overview.pendingTx}건` },
                { label: 'TC 총 유통량', value: `${Number(overview.totalTC).toFixed(1)} TC`, sub: '' },
                { label: '취약계층 회원', value: `${overview.vulnerableMembers}명`, sub: `제공자 ${overview.providerCount} / 수요자 ${overview.receiverCount}` },
              ].map(({ label, value, sub }) => (
                <Card key={label}>
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-xl font-bold mt-0.5">{value}</p>
                    {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* TC 흐름 파이차트 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">서비스 유형별 TC 비중</CardTitle>
              </CardHeader>
              <CardContent>
                {pieData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">데이터가 없습니다.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => `${v} TC`} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* TC 흐름 바차트 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">서비스 유형별 거래 건수</CardTitle>
              </CardHeader>
              <CardContent>
                {barData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">데이터가 없습니다.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={barData} layout="vertical">
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={65} />
                      <Tooltip />
                      <Bar dataKey="거래수" fill="#6366f1" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 동별 현황 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">동별 현황</CardTitle>
            </CardHeader>
            <CardContent>
              {dongData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">데이터가 없습니다.</p>
              ) : (
                <>
                  <div className="hidden md:block">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 text-xs text-muted-foreground font-medium">동</th>
                          <th className="text-right py-2 text-xs text-muted-foreground font-medium">전체 회원</th>
                          <th className="text-right py-2 text-xs text-muted-foreground font-medium">제공자</th>
                          <th className="text-right py-2 text-xs text-muted-foreground font-medium">수요자</th>
                          <th className="text-right py-2 text-xs text-muted-foreground font-medium">TC 잔액</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {dongData.map((d) => (
                          <tr key={d.dong}>
                            <td className="py-2.5 font-medium">{d.dong}</td>
                            <td className="py-2.5 text-right">{d.members}명</td>
                            <td className="py-2.5 text-right text-blue-600">{d.providers}명</td>
                            <td className="py-2.5 text-right text-amber-600">{d.receivers}명</td>
                            <td className="py-2.5 text-right font-semibold">{Number(d.tcBalance).toFixed(1)} TC</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* 모바일 카드형 */}
                  <div className="md:hidden space-y-3">
                    {dongData.map((d) => (
                      <div key={d.dong} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <p className="font-medium text-sm">{d.dong}</p>
                          <p className="text-xs text-muted-foreground">
                            제공자 {d.providers}명 · 수요자 {d.receivers}명
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-blue-600">{Number(d.tcBalance).toFixed(1)} TC</p>
                          <p className="text-xs text-muted-foreground">전체 {d.members}명</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
