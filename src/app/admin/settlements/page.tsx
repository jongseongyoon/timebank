'use client'

import { useEffect, useState, useCallback } from 'react'
import { Landmark, RefreshCw, CheckCircle, Copy, Clock, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'

function currentMonth() {
  return new Date().toISOString().slice(0, 7)
}

export default function SettlementsPage() {
  const [month, setMonth] = useState(currentMonth())
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [msg, setMsg] = useState('')

  const load = useCallback(async (m: string) => {
    setLoading(true)
    const res = await fetch(`/api/admin/settlements?month=${m}`)
    const d = await res.json()
    setData(d)
    setLoading(false)
  }, [])

  useEffect(() => { load(month) }, [month, load])

  async function handleGenerate() {
    setGenerating(true)
    setMsg('')
    const res = await fetch('/api/admin/settlements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month }),
    })
    const d = await res.json()
    setGenerating(false)
    if (!res.ok) { setMsg(d.error ?? '정산 생성 실패'); return }
    setMsg(d.created > 0 || d.mergedTx > 0
      ? `정산 생성 완료 — 신규 ${d.created}건${d.mergedTx ? `, 추가반영 ${d.mergedTx}건` : ''}${d.skipped ? `, 건너뜀 ${d.skipped}건` : ''}`
      : (d.message ?? '정산할 거래가 없습니다.'))
    load(month)
    setTimeout(() => setMsg(''), 5000)
  }

  async function handleTransfer(id: string, store: string, amount: number) {
    const note = window.prompt(`${store} · ${amount.toLocaleString('ko-KR')}원을 이체 완료 처리합니다.\n메모(선택):`, '')
    if (note === null) return
    const res = await fetch('/api/admin/settlements', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settlementId: id, status: 'TRANSFERRED', note: note || undefined }),
    })
    if (res.ok) load(month)
    else setMsg('처리 실패')
  }

  async function handleRevert(id: string) {
    if (!window.confirm('이체 완료를 취소하고 다시 대기 상태로 되돌립니다. 계속할까요?')) return
    const res = await fetch('/api/admin/settlements', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settlementId: id, status: 'PENDING' }),
    })
    if (res.ok) load(month)
  }

  function copy(text: string) {
    navigator.clipboard?.writeText(text)
    setMsg('계좌번호 복사됨')
    setTimeout(() => setMsg(''), 1500)
  }

  const settlements = data?.settlements ?? []
  const pendingTotal = settlements.filter((s: any) => s.status === 'PENDING').reduce((a: number, s: any) => a + s.totalCashAmount, 0)
  const transferredTotal = settlements.filter((s: any) => s.status === 'TRANSFERRED').reduce((a: number, s: any) => a + s.totalCashAmount, 0)

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Landmark className="h-6 w-6 text-orange-600" /> 착한쿠폰 정산
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          가게에 모인 착한쿠폰 결제액을 월별로 묶어 계좌이체 정산합니다.
        </p>
      </div>

      {/* 월 선택 + 정산 생성 */}
      <div className="bg-white border rounded-xl p-5 space-y-4">
        <div className="flex items-end gap-3 flex-wrap">
          <div className="space-y-1">
            <label className="text-sm font-medium">정산 월</label>
            <input
              type="month"
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="h-10 px-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <Button onClick={handleGenerate} disabled={generating} className="gap-2 bg-orange-600 hover:bg-orange-700">
            <RefreshCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
            {generating ? '생성 중...' : '이 달 정산 생성'}
          </Button>
        </div>
        {data && data.unsettledTxCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            이 달 미정산 거래 {data.unsettledTxCount}건 · {data.unsettledAmount.toLocaleString('ko-KR')}원 — &lsquo;정산 생성&rsquo;을 눌러 묶으세요
          </div>
        )}
        {msg && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">{msg}</p>}
      </div>

      {/* 요약 */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: '정산 대기', value: `${pendingTotal.toLocaleString('ko-KR')}원`, color: 'text-amber-700' },
          { label: '이체 완료', value: `${transferredTotal.toLocaleString('ko-KR')}원`, color: 'text-green-700' },
          { label: '정산 가게 수', value: `${settlements.length}곳`, color: 'text-blue-700' },
        ].map(item => (
          <div key={item.label} className="bg-white border rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">{item.label}</p>
            <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* 정산 목록 */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h3 className="font-semibold text-sm">{month} 정산 내역</h3>
        </div>
        {loading ? (
          <div className="py-12 text-center text-gray-400 text-sm">불러오는 중...</div>
        ) : settlements.length === 0 ? (
          <div className="py-12 text-center text-gray-400 text-sm">
            정산 내역이 없습니다. 위에서 &lsquo;이 달 정산 생성&rsquo;을 눌러주세요.
          </div>
        ) : (
          <div className="divide-y">
            {settlements.map((s: any) => (
              <div key={s.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{s.storeName} <span className="text-xs text-gray-400">{s.dong}</span></p>
                  <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {s.bankName && s.accountNo ? (
                      <>
                        <span>{s.bankName} {s.accountNo} ({s.accountHolder})</span>
                        <button onClick={() => copy(s.accountNo)} className="text-gray-400 hover:text-gray-700" title="계좌번호 복사">
                          <Copy className="h-3 w-3" />
                        </button>
                      </>
                    ) : (
                      <span className="text-red-500">⚠ 계좌정보 없음</span>
                    )}
                    <span>· {s.transactionCount}건</span>
                  </div>
                  {s.status === 'TRANSFERRED' && s.bankTransferDate && (
                    <p className="text-xs text-green-600 mt-0.5">이체완료 {formatDate(s.bankTransferDate)}{s.bankTransferNote ? ` · ${s.bankTransferNote}` : ''}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-orange-700">{s.totalCashAmount.toLocaleString('ko-KR')}원</p>
                  {s.status === 'PENDING' ? (
                    <Button size="sm" variant="outline" className="mt-1 h-7 text-xs gap-1"
                      onClick={() => handleTransfer(s.id, s.storeName, s.totalCashAmount)}>
                      <CheckCircle className="h-3 w-3" /> 이체 완료
                    </Button>
                  ) : s.status === 'TRANSFERRED' ? (
                    <button onClick={() => handleRevert(s.id)} className="mt-1 text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1 ml-auto">
                      <Clock className="h-3 w-3" /> 되돌리기
                    </button>
                  ) : (
                    <span className="text-xs text-red-500">{s.status}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
