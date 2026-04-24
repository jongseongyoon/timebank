'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatDate } from '@/lib/utils'
import { Landmark, Plus, Loader2, AlertTriangle, ShieldCheck, ShieldAlert, HeartHandshake } from 'lucide-react'

const FUND_TX_TYPE_LABEL: Record<string, string> = {
  CONTRIBUTION: '기여금 (광주서구청)',
  PRIVATE_PAYMENT: '민간시장 지불',
  EMERGENCY_SERVICE: '긴급서비스',
  VULNERABLE_ALLOC: '취약계층 배분',
  EXTERNAL_PURCHASE: '외부시장 구매',
  REFUND: '환급',
}

const FUND_TX_VARIANT: Record<string, any> = {
  CONTRIBUTION: 'success',
  PRIVATE_PAYMENT: 'destructive',
  EMERGENCY_SERVICE: 'warning',
  VULNERABLE_ALLOC: 'secondary',
  REFUND: 'outline',
}

interface FundTx {
  id: string
  createdAt: string
  fundTxType: string
  tcEquivalent: number
  cashAmount: number
  description: string
  approvedBy: string[]
  externalVendor: string | null
}

interface FundStatus {
  totalTC: number
  fundTC: number
  fundCash: number
  reserveRatio: number
}

interface CoverageData {
  totalLiabilityTc: number
  savingsTc: number
  activePackageTc: number
  totalFundTc: number
  totalFundCash: number
  coverageRatio: number
  activePackages: any[]
}

export default function AdminFundPage() {
  const [status, setStatus] = useState<FundStatus | null>(null)
  const [txs, setTxs] = useState<FundTx[]>([])
  const [coverage, setCoverage] = useState<CoverageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    fundTxType: 'CONTRIBUTION',
    tcEquivalent: '',
    cashAmount: '',
    description: '',
    externalVendor: '',
  })

  async function fetchData() {
    setLoading(true)
    const [sRes, tRes, cRes] = await Promise.all([
      fetch('/api/admin/fund/status'),
      fetch('/api/admin/fund/transactions'),
      fetch('/api/admin/fund-coverage'),
    ])
    const [s, t, c] = await Promise.all([sRes.json(), tRes.json(), cRes.json()])
    setStatus(s)
    setTxs(t.transactions ?? [])
    if (!c.error) setCoverage(c)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const res = await fetch('/api/admin/fund/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fundTxType: form.fundTxType,
        tcEquivalent: Number(form.tcEquivalent),
        cashAmount: Number(form.cashAmount),
        description: form.description,
        externalVendor: form.externalVendor || null,
      }),
    })
    if (res.ok) {
      setShowForm(false)
      setForm({ fundTxType: 'CONTRIBUTION', tcEquivalent: '', cashAmount: '', description: '', externalVendor: '' })
      fetchData()
    }
    setSubmitting(false)
  }

  const reserveRatio = status?.reserveRatio ?? 0

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">기금 관리</h1>
          <p className="text-muted-foreground text-sm mt-1">지불준비금 기금 현황 및 거래 내역</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          기금 거래 등록
        </Button>
      </div>

      {/* 기금 현황 카드 */}
      {status && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-xs text-muted-foreground">TC 총 유통량</p>
              <p className="text-xl font-bold text-blue-600">{status.totalTC.toFixed(1)} TC</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-xs text-muted-foreground">기금 보유 TC</p>
              <p className="text-xl font-bold text-indigo-600">{status.fundTC.toFixed(1)} TC</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-xs text-muted-foreground">현금 보유액</p>
              <p className="text-xl font-bold text-slate-700">{status.fundCash.toLocaleString('ko-KR')}원</p>
            </CardContent>
          </Card>
          <Card className={reserveRatio < 30 ? 'border-red-300' : ''}>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-xs text-muted-foreground">지불준비율</p>
              <p className={`text-xl font-bold ${reserveRatio >= 30 ? 'text-emerald-600' : 'text-red-600'}`}>
                {reserveRatio}%
              </p>
              {reserveRatio < 30 && (
                <p className="text-xs text-red-500 flex items-center justify-center gap-1 mt-1">
                  <AlertTriangle className="h-3 w-3" />위험
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 지불준비율 게이지 */}
      {status && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Landmark className="h-4 w-4" />
              지불준비율 게이지 (권장: 30% 이상)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span>0%</span>
              <span className="text-amber-600 font-medium">⚠ 위험선 30%</span>
              <span>100%</span>
            </div>
            <div className="relative h-5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  reserveRatio >= 30 ? 'bg-emerald-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(reserveRatio, 100)}%` }}
                role="progressbar"
                aria-valuenow={reserveRatio}
                aria-valuemin={0}
                aria-valuemax={100}
              />
              <div
                className="absolute top-0 h-full w-0.5 bg-amber-400"
                style={{ left: '30%' }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              기금 보유 {status.fundTC.toFixed(1)} TC / 총 유통 {status.totalTC.toFixed(1)} TC
            </p>
          </CardContent>
        </Card>
      )}

      {/* TC 채무 보증 현황 (광주서구청 지불보증) */}
      {coverage && (
        <Card className={coverage.coverageRatio < 50 ? 'border-orange-300' : 'border-green-200'}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {coverage.coverageRatio >= 80
                ? <ShieldCheck className="h-4 w-4 text-green-500" />
                : <ShieldAlert className="h-4 w-4 text-orange-500" />}
              TC 채무 보증 현황 (광주서구청 지불보증)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 보증 비율 */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-rose-50 rounded-lg p-3">
                <p className="text-xs text-rose-600">총 미상환 TC 채무</p>
                <p className="text-lg font-bold text-rose-700">{coverage.totalLiabilityTc.toFixed(1)}</p>
                <p className="text-xs text-rose-500">TC (회원 잔액 합)</p>
              </div>
              <div className="bg-indigo-50 rounded-lg p-3">
                <p className="text-xs text-indigo-600">장기저축 TC</p>
                <p className="text-lg font-bold text-indigo-700">{coverage.savingsTc.toFixed(1)}</p>
                <p className="text-xs text-indigo-500">TC (미래 돌봄 예약)</p>
              </div>
              <div className={`rounded-lg p-3 ${coverage.coverageRatio >= 80 ? 'bg-green-50' : coverage.coverageRatio >= 50 ? 'bg-yellow-50' : 'bg-red-50'}`}>
                <p className={`text-xs ${coverage.coverageRatio >= 80 ? 'text-green-600' : coverage.coverageRatio >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                  기금 보증 비율
                </p>
                <p className={`text-lg font-bold ${coverage.coverageRatio >= 80 ? 'text-green-700' : coverage.coverageRatio >= 50 ? 'text-yellow-700' : 'text-red-700'}`}>
                  {coverage.coverageRatio}%
                </p>
                <p className={`text-xs ${coverage.coverageRatio >= 80 ? 'text-green-500' : 'text-orange-500'}`}>
                  {coverage.coverageRatio >= 80 ? '✅ 안전' : coverage.coverageRatio >= 50 ? '⚠ 주의' : '🚨 위험'}
                </p>
              </div>
            </div>

            {/* 보증 구조 설명 */}
            <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 space-y-1">
              <p className="font-medium text-slate-700">📋 지불보증 구조 (광주서구청 역할)</p>
              <p>• 회원들이 적립한 TC ({coverage.totalLiabilityTc.toFixed(1)} TC)는 미래 돌봄서비스로 상환해야 할 채무</p>
              <p>• 기금은 회원 내 서비스 제공 불가 시 <strong>외부시장에서 구매</strong>하여 보증</p>
              <p>• 기금 TC {coverage.totalFundTc.toFixed(1)} TC / 현금 {coverage.totalFundCash.toLocaleString('ko-KR')}원 보유</p>
            </div>

            {/* 진행중 돌봄 패키지 */}
            {coverage.activePackages.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <HeartHandshake className="h-3.5 w-3.5" /> 진행중 돌봄 패키지 ({coverage.activePackages.length}건)
                </p>
                <div className="space-y-1.5">
                  {coverage.activePackages.map((p: any) => {
                    const used = Number(p.usedTcAmount)
                    const total = Number(p.totalTcAmount)
                    const pct = total > 0 ? Math.round((used / total) * 100) : 0
                    return (
                      <div key={p.id} className="bg-white border rounded-md px-3 py-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-xs font-medium">{p.title}</p>
                            <p className="text-xs text-muted-foreground">
                              수혜: {p.recipient?.name} ({p.recipient?.dong})
                              {p.organization && ` · ${p.organization.name}`}
                            </p>
                          </div>
                          <span className="text-xs font-bold text-amber-600">{used.toFixed(1)}/{total.toFixed(0)} TC</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                          <div className="h-full bg-green-400 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 기금 거래 등록 폼 */}
      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">기금 거래 등록</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">거래 유형 *</Label>
                  <select
                    value={form.fundTxType}
                    onChange={(e) => setForm((p) => ({ ...p, fundTxType: e.target.value }))}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    required
                  >
                    {Object.entries(FUND_TX_TYPE_LABEL).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">TC 상당액 *</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="0.00"
                    value={form.tcEquivalent}
                    onChange={(e) => setForm((p) => ({ ...p, tcEquivalent: e.target.value }))}
                    className="h-9"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">현금액 (원) *</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={form.cashAmount}
                    onChange={(e) => setForm((p) => ({ ...p, cashAmount: e.target.value }))}
                    className="h-9"
                    required
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs">설명 *</Label>
                  <Input
                    placeholder="거래 설명"
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    className="h-9"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">외부 업체명</Label>
                  <Input
                    placeholder="선택"
                    value={form.externalVendor}
                    onChange={(e) => setForm((p) => ({ ...p, externalVendor: e.target.value }))}
                    className="h-9"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={submitting} size="sm">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : '등록'}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                  취소
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 거래 내역 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">기금 거래 내역</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : txs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">기금 거래 내역이 없습니다.</p>
          ) : (
            <div className="divide-y">
              {txs.map((tx) => (
                <div key={tx.id} className="py-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={FUND_TX_VARIANT[tx.fundTxType]} className="text-xs">
                        {FUND_TX_TYPE_LABEL[tx.fundTxType] ?? tx.fundTxType}
                      </Badge>
                      {tx.externalVendor && (
                        <span className="text-xs text-muted-foreground">{tx.externalVendor}</span>
                      )}
                    </div>
                    <p className="text-sm mt-1">{tx.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatDate(tx.createdAt)}</p>
                    {tx.approvedBy.length > 0 && (
                      <p className="text-xs text-muted-foreground">승인: {tx.approvedBy.join(', ')}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-blue-600">{Number(tx.tcEquivalent).toFixed(1)} TC</p>
                    <p className="text-xs text-muted-foreground">{Number(tx.cashAmount).toLocaleString('ko-KR')}원</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
