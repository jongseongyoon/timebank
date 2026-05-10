'use client'

import { useEffect, useState } from 'react'
import { Loader2, AlertTriangle, XOctagon, Heart, RefreshCw, Stethoscope, TrendingDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// ── 타입 ──────────────────────────────────────────────────────────────────────
interface FundSummary {
  healthFund: {
    tpBalance: number; totalContributed: number; totalDistributed: number
  } | null
  circulationPool: {
    tpBalance: number; totalCirculated: number; totalDistributed: number
  } | null
  spFund: {
    tpBalance: number; totalContributed: number; totalDistributed: number
    distributedThisYear: number; annualLimit: number; usagePct: number
    activePrescriptions: number; pendingPrescriptions: number
  } | null
  adminIssuance: {
    issuedThisYear: number; annualLimit: number; usagePct: number
    warningThreshold: number; criticalThreshold: number
    isWarning: boolean; isCritical: boolean
  }
  walkConfig: {
    distributedThisYear: number; annualTpLimit: number
    usagePct: number; tpPerGoal: number
  } | null
}

interface TxItem {
  id: string; createdAt: string; txType: string
  tpAmount: number; description: string; balanceAfter: number
}

interface AdminIssuanceItem {
  id: string; createdAt: string; issuanceType: string
  tpAmount: number; cumulativeIssued: number; adminBalance: number
  description: string; receiverName?: string; receiverDong?: string
}

interface FundsData {
  summary: FundSummary
  recentAdminIssuances: AdminIssuanceItem[]
  recentHealthFundTxs: TxItem[]
  recentSpFundTxs: TxItem[]
}

// ── 유틸 ──────────────────────────────────────────────────────────────────────
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function ProgressBar({ pct, isWarning, isCritical }: { pct: number; isWarning?: boolean; isCritical?: boolean }) {
  const color = isCritical ? 'bg-red-500' : isWarning ? 'bg-orange-400' : 'bg-indigo-500'
  return (
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  )
}

// ── 기금 카드 ─────────────────────────────────────────────────────────────────
function FundCard({
  icon, title, balance, sub, usagePct, isWarning, isCritical, extra,
}: {
  icon: React.ReactNode
  title: string
  balance: number
  sub?: string
  usagePct?: number
  isWarning?: boolean
  isCritical?: boolean
  extra?: React.ReactNode
}) {
  const alertIcon = isCritical
    ? <XOctagon className="h-4 w-4 text-red-500" />
    : isWarning
    ? <AlertTriangle className="h-4 w-4 text-orange-400" />
    : null

  return (
    <Card className={`${isCritical ? 'border-red-400 bg-red-50' : isWarning ? 'border-orange-300 bg-orange-50' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle className="text-sm font-medium text-gray-700">{title}</CardTitle>
          </div>
          {alertIcon}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-2xl font-bold tabular-nums">
          {balance.toLocaleString()} TP
        </p>
        {sub && <p className="text-xs text-gray-500">{sub}</p>}
        {usagePct !== undefined && (
          <div className="space-y-1">
            <ProgressBar pct={usagePct} isWarning={isWarning} isCritical={isCritical} />
            <p className="text-xs text-right text-gray-400">{usagePct.toFixed(1)}% 사용</p>
          </div>
        )}
        {extra}
      </CardContent>
    </Card>
  )
}

// ── 내역 테이블 ───────────────────────────────────────────────────────────────
function TxTable({ title, rows }: { title: string; rows: TxItem[] }) {
  if (rows.length === 0) return null
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-gray-700">{title}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-gray-600">
          <thead>
            <tr className="border-b text-gray-400">
              <th className="text-left pb-1 pr-2">일시</th>
              <th className="text-left pb-1 pr-2">유형</th>
              <th className="text-right pb-1 pr-2">금액</th>
              <th className="text-right pb-1">잔액</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-b border-gray-50">
                <td className="py-1 pr-2 whitespace-nowrap">{fmtDate(r.createdAt)}</td>
                <td className="py-1 pr-2">{r.txType}</td>
                <td className="py-1 pr-2 text-right tabular-nums font-medium text-indigo-700">
                  {r.tpAmount > 0 ? '+' : ''}{r.tpAmount}
                </td>
                <td className="py-1 text-right tabular-nums">{r.balanceAfter}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── 관리자 발행 내역 ──────────────────────────────────────────────────────────
function AdminIssuanceTable({ rows }: { rows: AdminIssuanceItem[] }) {
  if (rows.length === 0) return null
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-gray-700">최근 관리자 발행 내역</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-gray-600">
          <thead>
            <tr className="border-b text-gray-400">
              <th className="text-left pb-1 pr-2">일시</th>
              <th className="text-left pb-1 pr-2">유형</th>
              <th className="text-left pb-1 pr-2">대상자</th>
              <th className="text-right pb-1 pr-2">금액</th>
              <th className="text-right pb-1">누적 잔고</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-b border-gray-50">
                <td className="py-1 pr-2 whitespace-nowrap">{fmtDate(r.createdAt)}</td>
                <td className="py-1 pr-2">{r.issuanceType}</td>
                <td className="py-1 pr-2">{r.receiverName ?? '-'} {r.receiverDong ? `(${r.receiverDong})` : ''}</td>
                <td className="py-1 pr-2 text-right tabular-nums font-medium text-red-600">
                  +{r.tpAmount}
                </td>
                <td className="py-1 text-right tabular-nums text-red-500">{r.adminBalance.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────
export default function AdminFundsPage() {
  const [data, setData] = useState<FundsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/funds')
      if (res.ok) {
        setData(await res.json())
        setLastRefresh(new Date())
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!data) {
    return <p className="text-center text-gray-400 mt-12">데이터를 불러올 수 없습니다.</p>
  }

  const { summary } = data
  const admin = summary.adminIssuance

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">재원 통합 현황</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            마지막 갱신: {lastRefresh.toLocaleTimeString('ko-KR')}
          </p>
        </div>
        <button onClick={loadData} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <RefreshCw className="h-4 w-4" />
          새로고침
        </button>
      </div>

      {/* 경고 배너 */}
      {admin.isCritical && (
        <div className="bg-red-50 border border-red-400 rounded-xl p-4 flex gap-3">
          <XOctagon className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800">⚠️ 관리자 마이너스 발행 위험 수준</p>
            <p className="text-sm text-red-700 mt-0.5">
              올해 한도 {admin.annualLimit.toLocaleString()} TP 중 {admin.usagePct.toFixed(1)}% ({admin.issuedThisYear.toLocaleString()} TP) 사용됨.
              즉시 기금 보충이 필요합니다.
            </p>
          </div>
        </div>
      )}
      {!admin.isCritical && admin.isWarning && (
        <div className="bg-orange-50 border border-orange-300 rounded-xl p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-orange-800">관리자 마이너스 발행 주의</p>
            <p className="text-sm text-orange-700 mt-0.5">
              올해 한도의 {admin.usagePct.toFixed(1)}% ({admin.issuedThisYear.toLocaleString()} TP) 사용됨.
              기금 보충을 검토하세요.
            </p>
          </div>
        </div>
      )}

      {/* 4개 기금 카드 */}
      <div className="grid grid-cols-2 gap-4">
        {/* 건강증진 기금 */}
        <FundCard
          icon={<Heart className="h-4 w-4 text-green-600" />}
          title="건강증진 기금"
          balance={summary.healthFund?.tpBalance ?? 0}
          sub={`총 투입: ${(summary.healthFund?.totalContributed ?? 0).toLocaleString()} TP · 지급: ${(summary.healthFund?.totalDistributed ?? 0).toLocaleString()} TP`}
          usagePct={summary.walkConfig?.usagePct}
        />

        {/* 공동체 순환 풀 */}
        <FundCard
          icon={<RefreshCw className="h-4 w-4 text-blue-600" />}
          title="공동체 순환 풀"
          balance={summary.circulationPool?.tpBalance ?? 0}
          sub={`총 환류: ${(summary.circulationPool?.totalCirculated ?? 0).toLocaleString()} TP · 재분배: ${(summary.circulationPool?.totalDistributed ?? 0).toLocaleString()} TP`}
        />

        {/* 사회적처방 기금 */}
        <FundCard
          icon={<Stethoscope className="h-4 w-4 text-purple-600" />}
          title="사회적처방 기금"
          balance={summary.spFund?.tpBalance ?? 0}
          sub={`활성 처방: ${summary.spFund?.activePrescriptions ?? 0}건 · 대기: ${summary.spFund?.pendingPrescriptions ?? 0}건`}
          usagePct={summary.spFund?.usagePct}
          extra={
            summary.spFund && (
              <div className="flex gap-2 mt-1">
                <Badge variant="outline" className="text-xs">활성 {summary.spFund.activePrescriptions}건</Badge>
                {summary.spFund.pendingPrescriptions > 0 && (
                  <Badge className="text-xs bg-yellow-100 text-yellow-700">대기 {summary.spFund.pendingPrescriptions}건</Badge>
                )}
              </div>
            )
          }
        />

        {/* 관리자 마이너스 발행 */}
        <FundCard
          icon={<TrendingDown className="h-4 w-4 text-red-500" />}
          title="관리자 마이너스 발행"
          balance={admin.issuedThisYear}
          sub={`연간 한도: ${admin.annualLimit.toLocaleString()} TP (${new Date().getFullYear()}년)`}
          usagePct={admin.usagePct}
          isWarning={admin.isWarning}
          isCritical={admin.isCritical}
          extra={
            <div className="flex items-center gap-1 mt-1 text-xs">
              {admin.isCritical
                ? <span className="text-red-600 font-medium">🔴 위험 ({admin.criticalThreshold}% 초과)</span>
                : admin.isWarning
                ? <span className="text-orange-600 font-medium">🟡 주의 ({admin.warningThreshold}% 초과)</span>
                : <span className="text-green-600">🟢 정상</span>
              }
            </div>
          }
        />
      </div>

      {/* 만보기 연간 현황 */}
      {summary.walkConfig && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">만보기 연간 발행 현황</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>배분량 / 한도</span>
              <span className="tabular-nums font-medium">
                {summary.walkConfig.distributedThisYear.toLocaleString()} / {summary.walkConfig.annualTpLimit.toLocaleString()} TP
              </span>
            </div>
            <ProgressBar pct={summary.walkConfig.usagePct} />
            <p className="text-xs text-gray-400 text-right">{summary.walkConfig.usagePct.toFixed(1)}% · 달성당 {summary.walkConfig.tpPerGoal} TP</p>
          </CardContent>
        </Card>
      )}

      {/* 최근 내역 */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-4">
          <TxTable title="건강증진 기금 최근 내역" rows={data.recentHealthFundTxs} />
        </Card>
        <Card className="p-4">
          <TxTable title="사회적처방 기금 최근 내역" rows={data.recentSpFundTxs} />
        </Card>
      </div>

      {data.recentAdminIssuances.length > 0 && (
        <Card className="p-4">
          <AdminIssuanceTable rows={data.recentAdminIssuances} />
        </Card>
      )}
    </div>
  )
}
