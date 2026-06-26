'use client'

import { useEffect, useState } from 'react'
import { Search, Gift, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'

const KRW_PER_TP = 100000 / 9.69

export default function AdminCouponsPage() {
  const [search, setSearch] = useState('')
  const [members, setMembers] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [cashAmount, setCashAmount] = useState(100000)
  const [validDays, setValidDays] = useState(365)
  const [reason, setReason] = useState('')
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  function loadStats() {
    fetch('/api/admin/coupons').then(r => r.json()).then(setStats)
  }
  useEffect(() => { loadStats() }, [])

  async function handleSearch() {
    if (!search.trim()) return
    const res = await fetch(`/api/coordinator/members?all=true&search=${encodeURIComponent(search)}`)
    const d = await res.json()
    setMembers(d.members ?? [])
  }

  async function handleIssue() {
    if (!selected) return
    setLoading(true)
    setError('')
    const res = await fetch('/api/admin/coupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: selected.id, cashAmount, validDays, prescriptionReason: reason }),
    })
    const d = await res.json()
    setLoading(false)
    if (!res.ok) { setError(typeof d.error === 'string' ? d.error : '발급 실패'); return }
    setSuccess(`${selected.name}님에게 쿠폰 발급 완료 (${d.couponNo})`)
    setSelected(null); setSearch(''); setMembers([]); setReason('')
    loadStats()
    setTimeout(() => setSuccess(''), 4000)
  }

  const internalTp = Math.round((cashAmount / KRW_PER_TP) * 100) / 100

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">착한쿠폰 발급</h1>
        <p className="text-muted-foreground text-sm mt-1">
          관리자가 회원에게 착한가게용 쿠폰(원화)을 직접 발급합니다. 회원에게는 원화 금액만 표시됩니다.
        </p>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: '발급 건수', value: `${stats.totalIssued}건`, color: 'text-orange-700' },
            { label: '활성 쿠폰', value: `${stats.activeCount}건`, color: 'text-green-700' },
            { label: '잔여 금액 합', value: `${Number(stats.totalRemaining).toLocaleString('ko-KR')}원`, color: 'text-blue-700' },
          ].map(item => (
            <div key={item.label} className="bg-white border rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">{item.label}</p>
              <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* 1. 회원 검색 */}
      <div className="bg-white border rounded-xl p-5 space-y-4">
        <h2 className="font-semibold">1. 회원 검색</h2>
        <div className="flex gap-2">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="이름 또는 전화번호"
            className="flex-1 h-10 px-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <Button onClick={handleSearch} size="sm" className="gap-1">
            <Search className="h-4 w-4" /> 검색
          </Button>
        </div>

        {members.length > 0 && (
          <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
            {members.map(m => (
              <button
                key={m.id}
                onClick={() => { setSelected(m); setMembers([]) }}
                className="w-full text-left px-4 py-3 hover:bg-orange-50 transition-colors"
              >
                <p className="text-sm font-medium">{m.name}</p>
                <p className="text-xs text-gray-500">{m.phone} · {m.dong}</p>
              </button>
            ))}
          </div>
        )}

        {selected && (
          <div className="bg-orange-50 rounded-lg px-4 py-3 flex items-center justify-between">
            <div>
              <p className="font-semibold">{selected.name}</p>
              <p className="text-sm text-gray-500">{selected.dong} · {selected.phone}</p>
            </div>
            <button onClick={() => setSelected(null)} className="text-gray-400 text-sm hover:text-gray-700">변경</button>
          </div>
        )}
      </div>

      {/* 2. 발급 설정 */}
      <div className="bg-white border rounded-xl p-5 space-y-4">
        <h2 className="font-semibold">2. 발급 설정</h2>
        <div className="space-y-2">
          <label className="text-sm font-medium">쿠폰 금액 (원)</label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1000} max={10000000} step={1000}
              value={cashAmount}
              onChange={e => setCashAmount(Number(e.target.value))}
              className="w-40 h-10 text-center text-lg font-bold border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <div className="flex gap-2">
              {[50000, 100000, 200000, 300000].map(n => (
                <button
                  key={n}
                  onClick={() => setCashAmount(n)}
                  className={`px-3 py-1.5 rounded-lg text-sm border ${cashAmount === n ? 'bg-orange-600 text-white border-orange-600' : 'border-gray-300 hover:bg-gray-50'}`}
                >
                  {(n / 10000)}만
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-400">내부 환산값(관리자 전용): 약 {internalTp} TP — 회원에게는 표시되지 않음</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">유효 기간</label>
          <div className="flex gap-2">
            {[{ d: 90, l: '3개월' }, { d: 180, l: '6개월' }, { d: 365, l: '1년' }].map(({ d, l }) => (
              <button
                key={d}
                onClick={() => setValidDays(d)}
                className={`px-3 py-1.5 rounded-lg text-sm border ${validDays === d ? 'bg-orange-600 text-white border-orange-600' : 'border-gray-300 hover:bg-gray-50'}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">발급 사유 *</label>
          <input
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="예: 사회적처방 지원, 저소득 가구 생활지원..."
            className="w-full h-10 px-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      {success && (
        <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg px-4 py-3">
          <CheckCircle className="h-5 w-5" /> {success}
        </div>
      )}

      <Button
        onClick={handleIssue}
        disabled={!selected || !reason || loading || cashAmount < 1000}
        className="w-full h-12 gap-2 text-base bg-orange-600 hover:bg-orange-700"
      >
        <Gift className="h-5 w-5" />
        {loading ? '처리 중...' : `${selected?.name ?? '회원'} 님에게 ${cashAmount.toLocaleString('ko-KR')}원 쿠폰 발급`}
      </Button>

      {/* 최근 발급 내역 */}
      {stats?.recent?.length > 0 && (
        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50">
            <h3 className="font-semibold text-sm">최근 발급 내역</h3>
          </div>
          <div className="divide-y max-h-72 overflow-y-auto">
            {stats.recent.map((c: any) => (
              <div key={c.id} className="px-4 py-3 text-sm flex justify-between">
                <div className="min-w-0">
                  <p className="font-medium">{c.receiverName} <span className="text-xs text-gray-400">{c.receiverDong}</span></p>
                  <p className="text-xs text-gray-400 truncate">{c.couponNo} · {c.prescriptionReason ?? ''}</p>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className="font-bold text-orange-700">{c.cashAmount.toLocaleString('ko-KR')}원</p>
                  <p className="text-xs text-gray-400">잔여 {c.cashRemaining.toLocaleString('ko-KR')}원 · {formatDate(c.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
