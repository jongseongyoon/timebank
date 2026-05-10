'use client'

import { useEffect, useState } from 'react'
import { Loader2, AlertTriangle, XOctagon, Heart, RefreshCw, Stethoscope, TrendingDown, Vault, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

// ── 타입 ──────────────────────────────────────────────────────────────────────
interface FundsData {
  summary: {
    healthFund: { tpBalance: number; totalContributed: number; totalDistributed: number } | null
    reserveFund: {
      tpBalance: number; cashBalance: number
      totalCirculated: number; totalDistributed: number
      circulationRate: number
      reserveRatio: number; circulatingTP: number; targetRatio: number
      isHealthy: boolean; isWarning: boolean; isCritical: boolean
      privateMarketCount: number; privateMarketTpUsed: number
    } | null
    spFund: {
      tpBalance: number; totalContributed: number
      distributedThisYear: number; annualLimit: number; usagePct: number
      activePrescriptions: number; pendingPrescriptions: number
    } | null
    adminIssuance: {
      issuedThisYear: number; annualLimit: number; usagePct: number
      warningThreshold: number; criticalThreshold: number
      isWarning: boolean; isCritical: boolean
    }
    walkConfig: { distributedThisYear: number; annualTpLimit: number; usagePct: number; tpPerGoal: number } | null
  }
  recentReserveTxs: Array<{
    id: string; createdAt: string; txType: string
    tpAmount: number; cashAmount: number; description: string
    tpBalanceAfter: number; externalVendor?: string; memberName?: string
  }>
  recentHealthFundTxs: Array<{ id: string; createdAt: string; txType: string; tpAmount: number; description: string; balanceAfter: number }>
  recentSpFundTxs:     Array<{ id: string; createdAt: string; txType: string; tpAmount: number; description: string; balanceAfter: number }>
}

// ── 유틸 ──────────────────────────────────────────────────────────────────────
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function ProgressBar({ pct, isWarning, isCritical, green }: { pct: number; isWarning?: boolean; isCritical?: boolean; green?: boolean }) {
  const color = isCritical ? 'bg-red-500' : isWarning ? 'bg-orange-400' : green ? 'bg-green-500' : 'bg-indigo-500'
  return (
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  )
}

// ── 지불준비율 게이지 ──────────────────────────────────────────────────────────
function ReserveRatioGauge({ reserve }: { reserve: NonNullable<FundsData['summary']['reserveFund']> }) {
  const pct         = reserve.reserveRatio
  const targetPct   = reserve.targetRatio  // 5%
  const warningPct  = 3
  const criticalPct = 1
  const barPct      = Math.min(pct / Math.max(targetPct * 1.5, pct + 1) * 100, 100)

  const statusColor = reserve.isCritical
    ? 'text-red-600' : reserve.isWarning ? 'text-orange-500' : 'text-green-600'
  const statusText  = reserve.isCritical
    ? '🔴 긴급 (1% 미만) — 민간대행 자동 중단'
    : reserve.isWarning
    ? '🟡 경고 (3% 미만) — 기금 충전 필요'
    : '🟢 정상 (5% 이상)'

  return (
    <Card className={`${reserve.isCritical ? 'border-red-400 bg-red-50' : reserve.isWarning ? 'border-orange-300 bg-orange-50' : 'border-green-200 bg-green-50'}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <Vault className="h-4 w-4" />
          지불준비율 현황
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span className={`text-4xl font-bold tabular-nums ${statusColor}`}>{pct.toFixed(2)}%</span>
          <span className="text-sm text-gray-400">/ 목표 {targetPct}%</span>
        </div>

        {/* 게이지 바 */}
        <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${reserve.isCritical ? 'bg-red-500' : reserve.isWarning ? 'bg-orange-400' : 'bg-green-500'}`}
            style={{ width: `${barPct}%` }}
          />
          {/* 기준선 표시 */}
          <div className="absolute top-0 h-full border-l-2 border-orange-300 border-dashed"
            style={{ left: `${(warningPct / Math.max(targetPct * 1.5, pct + 1)) * 100}%` }} />
          <div className="absolute top-0 h-full border-l-2 border-green-400 border-dashed"
            style={{ left: `${(targetPct / Math.max(targetPct * 1.5, pct + 1)) * 100}%` }} />
        </div>

        <div className="flex justify-between text-xs text-gray-400">
          <span>🔴 {criticalPct}%</span>
          <span>🟡 {warningPct}%</span>
          <span>🟢 {targetPct}% (목표)</span>
        </div>

        <p className={`text-sm font-medium ${statusColor}`}>{statusText}</p>

        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 pt-1 border-t border-gray-200">
          <div>
            <p className="text-gray-400">유통 TP</p>
            <p className="font-semibold tabular-nums">{reserve.circulatingTP.toLocaleString()} TP</p>
          </div>
          <div>
            <p className="text-gray-400">지불준비금</p>
            <p className="font-semibold tabular-nums">{reserve.tpBalance.toLocaleString()} TP</p>
          </div>
          <div>
            <p className="text-gray-400">현금 잔액</p>
            <p className="font-semibold tabular-nums">{reserve.cashBalance.toLocaleString()} 원</p>
          </div>
          <div>
            <p className="text-gray-400">거래 적립률</p>
            <p className="font-semibold">{(reserve.circulationRate * 100).toFixed(0)}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── 기금 충전 폼 ──────────────────────────────────────────────────────────────
function FundChargeForm({ onSuccess }: { onSuccess: () => void }) {
  const [fundType, setFundType] = useState('HEALTH_FUND')
  const [amount,   setAmount]   = useState('')
  const [source,   setSource]   = useState('지자체예산')
  const [note,     setNote]     = useState('')
  const [busy,     setBusy]     = useState(false)
  const [result,   setResult]   = useState<string | null>(null)

  async function handleCharge() {
    if (!amount || Number(amount) <= 0) return
    setBusy(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/funds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fundType, amount: Number(amount), source, note }),
      })
      const data = await res.json()
      if (res.ok) {
        setResult(`✅ ${Number(amount).toLocaleString()} TP 충전 완료 (잔액: ${data.balanceAfter?.toLocaleString()} TP)`)
        setAmount('')
        setNote('')
        onSuccess()
      } else {
        setResult(`❌ 오류: ${data.error}`)
      }
    } catch {
      setResult('❌ 네트워크 오류')
    } finally {
      setBusy(false)
    }
  }

  const FUND_LABELS: Record<string, string> = {
    HEALTH_FUND:   '건강증진 기금',
    SP_FUND:       '사회적처방 기금',
    RESERVE_FUND:  '지불준비금 (순환 풀)',
  }
  const SOURCES = ['지자체예산', '국비보조', '기업CSR', '후원금', '기타']

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-700">기금 충전</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 기금 선택 */}
        <div className="flex gap-2 flex-wrap">
          {Object.entries(FUND_LABELS).map(([key, label]) => (
            <button key={key} onClick={() => setFundType(key)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                fundType === key ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-600 hover:border-indigo-300'
              }`}>
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* 출처 */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">출처</label>
            <select value={source} onChange={e => setSource(e.target.value)}
              className="w-full text-sm border rounded-md px-2 py-1.5">
              {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {/* 금액 */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">TP 금액</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="0" min="0" step="1"
              className="w-full text-sm border rounded-md px-2 py-1.5" />
          </div>
        </div>

        {/* 메모 */}
        <input type="text" value={note} onChange={e => setNote(e.target.value)}
          placeholder="메모 (선택)"
          className="w-full text-sm border rounded-md px-2 py-1.5" />

        <Button className="w-full" size="sm" disabled={busy || !amount || Number(amount) <= 0}
          onClick={handleCharge}>
          {busy ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : null}
          {FUND_LABELS[fundType]} 충전하기
        </Button>

        {result && (
          <p className={`text-xs text-center ${result.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>
            {result}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// ── 내역 테이블 ───────────────────────────────────────────────────────────────
function TxTable({ title, rows }: { title: string; rows: Array<{ id: string; createdAt: string; txType: string; tpAmount: number; description: string; balanceAfter: number }> }) {
  if (!rows.length) return null
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-gray-600">{title}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-gray-600">
          <thead><tr className="border-b text-gray-400">
            <th className="text-left pb-1 pr-2">일시</th>
            <th className="text-left pb-1 pr-2">유형</th>
            <th className="text-right pb-1 pr-2">금액</th>
            <th className="text-right pb-1">잔액</th>
          </tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-b border-gray-50">
                <td className="py-1 pr-2 whitespace-nowrap">{fmtDate(r.createdAt)}</td>
                <td className="py-1 pr-2">{r.txType}</td>
                <td className="py-1 pr-2 text-right tabular-nums font-medium text-indigo-700">{r.tpAmount}</td>
                <td className="py-1 text-right tabular-nums">{r.balanceAfter}</td>
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
  const [data,        setData]        = useState<FundsData | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/funds')
      if (res.ok) { setData(await res.json()); setLastRefresh(new Date()) }
    } finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
    </div>
  )
  if (!data) return <p className="text-center text-gray-400 mt-12">데이터를 불러올 수 없습니다.</p>

  const { summary } = data
  const admin = summary.adminIssuance
  const reserve = summary.reserveFund

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">재원 통합 현황</h1>
          <p className="text-xs text-gray-400 mt-0.5">마지막 갱신: {lastRefresh.toLocaleTimeString('ko-KR')}</p>
        </div>
        <button onClick={loadData} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <RefreshCw className="h-4 w-4" /> 새로고침
        </button>
      </div>

      {/* 경고 배너 */}
      {reserve?.isCritical && (
        <div className="bg-red-50 border border-red-400 rounded-xl p-4 flex gap-3">
          <XOctagon className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800">🔴 지불준비율 긴급 — 민간대행 자동 중단</p>
            <p className="text-sm text-red-700 mt-0.5">
              현재 {reserve.reserveRatio.toFixed(2)}% (목표 {reserve.targetRatio}%). 즉시 기금 충전이 필요합니다.
            </p>
          </div>
        </div>
      )}
      {!reserve?.isCritical && reserve?.isWarning && (
        <div className="bg-orange-50 border border-orange-300 rounded-xl p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-orange-800">🟡 지불준비율 경고</p>
            <p className="text-sm text-orange-700 mt-0.5">
              현재 {reserve.reserveRatio.toFixed(2)}% — 3% 미만. 기금 충전을 검토하세요.
            </p>
          </div>
        </div>
      )}

      {/* 지불준비율 게이지 */}
      {reserve && <ReserveRatioGauge reserve={reserve} />}

      {/* 4개 기금 카드 */}
      <div className="grid grid-cols-2 gap-4">
        {/* 건강증진 기금 */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-green-600" />
              <CardTitle className="text-sm font-medium text-gray-700">건강증진 기금</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-bold text-green-700 tabular-nums">
              {(summary.healthFund?.tpBalance ?? 0).toLocaleString()} TP
            </p>
            <p className="text-xs text-gray-500">만보기 0.5 TP 전액 담당</p>
            {summary.walkConfig && (
              <>
                <ProgressBar pct={summary.walkConfig.usagePct} green />
                <p className="text-xs text-gray-400 text-right">올해 {summary.walkConfig.usagePct.toFixed(1)}% 사용</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* 지불준비금 (순환 풀) */}
        <Card className={reserve?.isCritical ? 'border-red-300 bg-red-50' : reserve?.isWarning ? 'border-orange-300 bg-orange-50' : ''}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Vault className="h-4 w-4 text-blue-600" />
                <CardTitle className="text-sm font-medium text-gray-700">지불준비금</CardTitle>
              </div>
              {reserve?.isCritical
                ? <XOctagon className="h-4 w-4 text-red-500" />
                : reserve?.isWarning
                ? <AlertTriangle className="h-4 w-4 text-orange-400" />
                : <CheckCircle2 className="h-4 w-4 text-green-500" />
              }
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-bold text-blue-700 tabular-nums">
              {(reserve?.tpBalance ?? 0).toLocaleString()} TP
            </p>
            <p className="text-xs text-gray-500">
              지불준비율: <strong className={reserve?.isCritical ? 'text-red-600' : reserve?.isWarning ? 'text-orange-500' : 'text-green-600'}>
                {reserve?.reserveRatio.toFixed(2) ?? 0}%
              </strong> (목표 {reserve?.targetRatio ?? 5}%)
            </p>
            <p className="text-xs text-gray-400">
              이번달 민간대행: {reserve?.privateMarketCount ?? 0}건 / {(reserve?.privateMarketTpUsed ?? 0).toLocaleString()} TP
            </p>
          </CardContent>
        </Card>

        {/* 사회적처방 기금 */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-purple-600" />
              <CardTitle className="text-sm font-medium text-gray-700">사회적처방 기금</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-bold text-purple-700 tabular-nums">
              {(summary.spFund?.tpBalance ?? 0).toLocaleString()} TP
            </p>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-xs">활성 {summary.spFund?.activePrescriptions ?? 0}건</Badge>
              {(summary.spFund?.pendingPrescriptions ?? 0) > 0 && (
                <Badge className="text-xs bg-yellow-100 text-yellow-700">대기 {summary.spFund?.pendingPrescriptions}건</Badge>
              )}
            </div>
            {summary.spFund && (
              <>
                <ProgressBar pct={summary.spFund.usagePct} />
                <p className="text-xs text-gray-400 text-right">올해 {summary.spFund.usagePct.toFixed(1)}% 사용</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* 관리자 마이너스 발행 */}
        <Card className={admin.isCritical ? 'border-red-300 bg-red-50' : admin.isWarning ? 'border-orange-300 bg-orange-50' : ''}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                <CardTitle className="text-sm font-medium text-gray-700">관리자 마이너스 발행</CardTitle>
              </div>
              {admin.isCritical
                ? <XOctagon className="h-4 w-4 text-red-500" />
                : admin.isWarning
                ? <AlertTriangle className="h-4 w-4 text-orange-400" />
                : null
              }
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-bold text-red-600 tabular-nums">
              {admin.issuedThisYear.toLocaleString()} TP
            </p>
            <p className="text-xs text-gray-500">연간 한도 {admin.annualLimit.toLocaleString()} TP</p>
            <ProgressBar pct={admin.usagePct} isWarning={admin.isWarning} isCritical={admin.isCritical} />
            <p className="text-xs text-right text-gray-400">{admin.usagePct.toFixed(1)}%</p>
          </CardContent>
        </Card>
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
            <ProgressBar pct={summary.walkConfig.usagePct} green />
            <p className="text-xs text-gray-400 text-right">{summary.walkConfig.usagePct.toFixed(1)}% · 달성당 {summary.walkConfig.tpPerGoal} TP (건강증진 기금 전액)</p>
          </CardContent>
        </Card>
      )}

      {/* 기금 충전 폼 */}
      <FundChargeForm onSuccess={loadData} />

      {/* 최근 내역 */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-4">
          <TxTable title="건강증진 기금 최근 내역" rows={data.recentHealthFundTxs} />
        </Card>
        <Card className="p-4">
          <TxTable title="사회적처방 기금 최근 내역" rows={data.recentSpFundTxs} />
        </Card>
      </div>

      {data.recentReserveTxs.length > 0 && (
        <Card className="p-4 space-y-1.5">
          <p className="text-xs font-semibold text-gray-600">지불준비금 최근 내역</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-gray-600">
              <thead><tr className="border-b text-gray-400">
                <th className="text-left pb-1 pr-2">일시</th>
                <th className="text-left pb-1 pr-2">유형</th>
                <th className="text-left pb-1 pr-2">대상</th>
                <th className="text-right pb-1 pr-2">TP</th>
                <th className="text-right pb-1">잔액</th>
              </tr></thead>
              <tbody>
                {data.recentReserveTxs.map(r => (
                  <tr key={r.id} className="border-b border-gray-50">
                    <td className="py-1 pr-2 whitespace-nowrap">{fmtDate(r.createdAt)}</td>
                    <td className="py-1 pr-2">{r.txType}</td>
                    <td className="py-1 pr-2">{r.externalVendor ?? r.memberName ?? '-'}</td>
                    <td className="py-1 pr-2 text-right tabular-nums font-medium text-indigo-700">{r.tpAmount}</td>
                    <td className="py-1 text-right tabular-nums">{r.tpBalanceAfter}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
