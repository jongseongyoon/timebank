'use client'

import { useEffect, useState } from 'react'
import { Search, Coins, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'

export default function AllocatePage() {
  const [search, setSearch] = useState('')
  const [members, setMembers] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [tcAmount, setTcAmount] = useState(10)
  const [reason, setReason] = useState('')
  const [stats, setStats] = useState<any>(null)
  const [recentLogs, setRecentLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/allocate').then(r => r.json()).then(d => {
      setStats(d)
      setRecentLogs(d.recentLogs ?? [])
    })
  }, [])

  async function handleSearch() {
    if (!search.trim()) return
    const res = await fetch(`/api/coordinator/members?search=${encodeURIComponent(search)}`)
    const d = await res.json()
    setMembers(d.members ?? [])
  }

  async function handleAllocate() {
    if (!selected) return
    setLoading(true)
    setError('')
    const res = await fetch('/api/admin/allocate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: selected.id, tcAmount, reason }),
    })
    const d = await res.json()
    setLoading(false)
    if (!res.ok) { setError(d.error); return }
    setSuccess(true)
    setSelected(null)
    setSearch('')
    setMembers([])
    setReason('')
    // 통계 갱신
    fetch('/api/admin/allocate').then(r => r.json()).then(d => {
      setStats(d)
      setRecentLogs(d.recentLogs ?? [])
    })
    setTimeout(() => setSuccess(false), 3000)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">TC 배분</h1>

      {/* 통계 카드 */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: '총 배분 완료', value: `${Number(stats.totalAllocated).toFixed(0)} TC`, color: 'text-blue-700' },
            { label: '총 회원 잔액', value: `${Number(stats.totalMemberBalance).toFixed(0)} TC`, color: 'text-green-700' },
            { label: '배분 건수', value: `${stats.allocationCount}건`, color: 'text-purple-700' },
          ].map(item => (
            <div key={item.label} className="bg-white border rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">{item.label}</p>
              <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* 회원 검색 */}
      <div className="bg-white border rounded-xl p-5 space-y-4">
        <h2 className="font-semibold">1. 회원 검색</h2>
        <div className="flex gap-2">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="이름 또는 전화번호"
            className="flex-1 h-10 px-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors ${selected?.id === m.id ? 'bg-blue-50' : ''}`}
              >
                <p className="text-sm font-medium">{m.name}</p>
                <p className="text-xs text-gray-500">{m.phone} · {m.dong} · {Number(m.tcBalance).toFixed(0)} TC</p>
              </button>
            ))}
          </div>
        )}

        {selected && (
          <div className="bg-blue-50 rounded-lg px-4 py-3 flex items-center justify-between">
            <div>
              <p className="font-semibold">{selected.name}</p>
              <p className="text-sm text-gray-500">{selected.dong} · 현재 {Number(selected.tcBalance).toFixed(0)} TC</p>
            </div>
            <button onClick={() => setSelected(null)} className="text-gray-400 text-sm hover:text-gray-700">변경</button>
          </div>
        )}
      </div>

      {/* 배분 입력 */}
      <div className="bg-white border rounded-xl p-5 space-y-4">
        <h2 className="font-semibold">2. 배분 설정</h2>
        <div className="space-y-2">
          <label className="text-sm font-medium">TC 수량</label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1} max={10000} step={1}
              value={tcAmount}
              onChange={e => setTcAmount(Number(e.target.value))}
              className="w-32 h-10 text-center text-lg font-bold border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              {[10, 30, 50, 100].map(n => (
                <button
                  key={n}
                  onClick={() => setTcAmount(n)}
                  className={`px-3 py-1.5 rounded-lg text-sm border ${tcAmount === n ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 hover:bg-gray-50'}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">배분 사유 *</label>
          <input
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="예: 자원봉사 활동 인정, 이벤트 참여 보상..."
            className="w-full h-10 px-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      {success && (
        <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg px-4 py-3">
          <CheckCircle className="h-5 w-5" /> TC 배분이 완료됐습니다
        </div>
      )}

      <Button
        onClick={handleAllocate}
        disabled={!selected || !reason || loading}
        className="w-full h-12 gap-2 text-base"
      >
        <Coins className="h-5 w-5" />
        {loading ? '처리 중...' : `${selected?.name ?? '회원'} 님에게 ${tcAmount} TC 배분`}
      </Button>

      {/* 최근 배분 내역 */}
      {recentLogs.length > 0 && (
        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50">
            <h3 className="font-semibold text-sm">최근 배분 내역</h3>
          </div>
          <div className="divide-y max-h-64 overflow-y-auto">
            {recentLogs.map(log => {
              const d = JSON.parse(log.details)
              return (
                <div key={log.id} className="px-4 py-3 text-sm flex justify-between">
                  <div>
                    <p className="font-medium">{d.targetName ?? '회원'}</p>
                    <p className="text-xs text-gray-400">{d.reason}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-blue-700">+{d.tcAmount} TC</p>
                    <p className="text-xs text-gray-400">{formatDate(log.createdAt)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
