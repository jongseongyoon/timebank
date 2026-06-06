'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Search, X, ChevronLeft, ChevronRight, RefreshCw,
  KeyRound, UserX, Save, AlertTriangle, Check,
} from 'lucide-react'
import { DONGS } from '@/lib/constants'

// ── 타입 ──────────────────────────────────────────────────────────────────
interface MemberRow {
  id:         string
  name:       string
  phone:      string
  dong:       string
  roles:      string[]
  status:     string
  memberType: string
  tpBalance:  string
  createdAt:  string
  syncSource: string
  birthDate:  string | null
}
interface MemberDetail extends MemberRow {
  email:          string | null
  address:        string | null
  isVulnerable:   boolean
  isDisabled:     boolean
  lifetimeEarned: string
  lifetimeSpent:  string
  tpExpiresAt:    string | null
  lastSyncedAt:   string | null
  avgRating:      string
  ratingCount:    number
  updatedAt:      string
  organization:   { id: string; name: string } | null
}

// ── 상수 ──────────────────────────────────────────────────────────────────
const ROLE_LABELS: Record<string, string>   = { RECEIVER: '수요자', PROVIDER: '제공자', COORDINATOR: '코디', ADMIN: '관리자' }
const STATUS_LABELS: Record<string, string> = { ACTIVE: '활성', DORMANT: '휴면', SUSPENDED: '정지', WITHDRAWN: '탈퇴' }
const STATUS_COLORS: Record<string, string> = {
  ACTIVE:    'bg-green-100 text-green-800',
  DORMANT:   'bg-yellow-100 text-yellow-800',
  SUSPENDED: 'bg-red-100 text-red-800',
  WITHDRAWN: 'bg-gray-100 text-gray-500',
}
const ROLE_COLORS: Record<string, string> = {
  RECEIVER:    'bg-blue-100 text-blue-700',
  PROVIDER:    'bg-indigo-100 text-indigo-700',
  COORDINATOR: 'bg-purple-100 text-purple-700',
  ADMIN:       'bg-rose-100 text-rose-700',
}
const ALL_ROLES = ['RECEIVER', 'PROVIDER', 'COORDINATOR', 'ADMIN']
const ALL_STATUSES = ['ACTIVE', 'DORMANT', 'SUSPENDED', 'WITHDRAWN']
const LIMIT = 20

// ── 유틸 ──────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' })
}
function fmtBirth(s: string | null) {
  if (!s || s.length < 8) return '-'
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
}
function fmtTP(v: string | number) {
  return `${Number(v).toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} TP`
}

// ── 컴포넌트 ──────────────────────────────────────────────────────────────
export default function MembersPage() {
  /* ── 목록 상태 ──────────────────────────────────────────────────────── */
  const [search,       setSearch]       = useState('')
  const [filterDong,   setFilterDong]   = useState('')
  const [filterRole,   setFilterRole]   = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [page,         setPage]         = useState(1)
  const [members,      setMembers]      = useState<MemberRow[]>([])
  const [total,        setTotal]        = useState(0)
  const [listLoading,  setListLoading]  = useState(true)

  /* ── 상세 패널 상태 ─────────────────────────────────────────────────── */
  const [selectedId,     setSelectedId]     = useState<string | null>(null)
  const [detail,         setDetail]         = useState<MemberDetail | null>(null)
  const [detailLoading,  setDetailLoading]  = useState(false)
  const [tab,            setTab]            = useState<'info' | 'tp' | 'security'>('info')

  /* ── 수정 폼 ─────────────────────────────────────────────────────────── */
  const [form,    setForm]    = useState({ name: '', phone: '', dong: '', birthDate: '', roles: [] as string[], status: '' })
  const [saving,  setSaving]  = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  /* ── TP 조정 ─────────────────────────────────────────────────────────── */
  const [tpAmount,    setTpAmount]    = useState('')
  const [tpDirection, setTpDirection] = useState<'add' | 'subtract'>('add')
  const [tpReason,    setTpReason]    = useState('')
  const [tpSaving,    setTpSaving]    = useState(false)
  const [tpMsg,       setTpMsg]       = useState<string | null>(null)

  /* ── 비밀번호 초기화 ─────────────────────────────────────────────────── */
  const [resetLoading, setResetLoading] = useState(false)
  const [resetResult,  setResetResult]  = useState<string | null>(null)

  /* ── 탈퇴 처리 ──────────────────────────────────────────────────────── */
  const [withdrawConfirm, setWithdrawConfirm] = useState(false)
  const [withdrawLoading, setWithdrawLoading] = useState(false)

  /* ── 목록 로드 ──────────────────────────────────────────────────────── */
  const loadMembers = useCallback(async () => {
    setListLoading(true)
    try {
      const q = new URLSearchParams({
        search, dong: filterDong, role: filterRole,
        status: filterStatus, page: String(page), limit: String(LIMIT),
      })
      const res  = await fetch(`/api/admin/members?${q}`)
      const data = await res.json()
      if (res.ok) { setMembers(data.members); setTotal(data.total) }
    } finally { setListLoading(false) }
  }, [search, filterDong, filterRole, filterStatus, page])

  useEffect(() => { loadMembers() }, [loadMembers])

  /* ── 상세 로드 ──────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!selectedId) return
    setDetailLoading(true)
    setDetail(null)
    setResetResult(null)
    setTpMsg(null)
    setSaveMsg(null)
    setTab('info')
    fetch(`/api/admin/members/${selectedId}`)
      .then(r => r.json())
      .then(d => {
        setDetail(d)
        setForm({
          name:      d.name,
          phone:     d.phone,
          dong:      d.dong,
          birthDate: fmtBirth(d.birthDate),
          roles:     d.roles,
          status:    d.status,
        })
      })
      .finally(() => setDetailLoading(false))
  }, [selectedId])

  /* ── 기본 정보 저장 ─────────────────────────────────────────────────── */
  async function handleSave() {
    if (!selectedId) return
    setSaving(true); setSaveMsg(null)
    try {
      const res  = await fetch(`/api/admin/members/${selectedId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          name:      form.name,
          phone:     form.phone,
          dong:      form.dong,
          birthDate: form.birthDate,
          roles:     form.roles,
          status:    form.status,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setSaveMsg(`오류: ${data.error}`); return }
      setSaveMsg('저장됐습니다.')
      setDetail(prev => prev ? { ...prev, ...data } : prev)
      loadMembers()
    } finally { setSaving(false) }
  }

  /* ── TP 조정 ─────────────────────────────────────────────────────────── */
  async function handleTpAdjust() {
    if (!selectedId || !tpAmount) return
    setTpSaving(true); setTpMsg(null)
    try {
      const res  = await fetch(`/api/admin/members/${selectedId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          tpAdjust: { amount: parseFloat(tpAmount), direction: tpDirection, reason: tpReason },
        }),
      })
      const data = await res.json()
      if (!res.ok) { setTpMsg(`오류: ${data.error}`); return }
      setTpMsg(`완료. 현재 잔액: ${fmtTP(data.tpBalance)}`)
      setDetail(prev => prev ? { ...prev, tpBalance: data.tpBalance, lifetimeEarned: data.lifetimeEarned, lifetimeSpent: data.lifetimeSpent } : prev)
      setMembers(prev => prev.map(m => m.id === selectedId ? { ...m, tpBalance: data.tpBalance } : m))
      setTpAmount('')
      setTpReason('')
    } finally { setTpSaving(false) }
  }

  /* ── 비밀번호 초기화 ─────────────────────────────────────────────────── */
  async function handleResetPw() {
    if (!selectedId) return
    setResetLoading(true); setResetResult(null)
    try {
      const res  = await fetch(`/api/admin/members/${selectedId}/reset-password`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setResetResult(`오류: ${data.error}`); return }
      setResetResult(`초기화 완료 — 임시 비밀번호: ${data.tempPw}`)
    } finally { setResetLoading(false) }
  }

  /* ── 탈퇴 처리 ──────────────────────────────────────────────────────── */
  async function handleWithdraw() {
    if (!selectedId) return
    setWithdrawLoading(true)
    try {
      const res = await fetch(`/api/admin/members/${selectedId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: 'WITHDRAWN' }),
      })
      if (res.ok) {
        setWithdrawConfirm(false)
        setDetail(prev => prev ? { ...prev, status: 'WITHDRAWN' } : prev)
        setForm(prev => ({ ...prev, status: 'WITHDRAWN' }))
        loadMembers()
      }
    } finally { setWithdrawLoading(false) }
  }

  /* ── 필터 변경 시 1페이지로 ────────────────────────────────────────── */
  function resetPage() { setPage(1) }

  const totalPages = Math.ceil(total / LIMIT)

  /* ── 렌더 ────────────────────────────────────────────────────────────── */
  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">

      {/* ── 좌측: 목록 ──────────────────────────────────────────────────── */}
      <div className={`flex flex-col flex-1 overflow-hidden transition-all ${selectedId ? 'mr-[480px]' : ''}`}>

        {/* 헤더 */}
        <div className="px-6 py-4 border-b bg-white space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">회원 관리</h1>
            <span className="text-sm text-muted-foreground">총 {total.toLocaleString()}명</span>
          </div>

          {/* 검색 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="이름 또는 전화번호로 검색"
              value={search}
              onChange={e => { setSearch(e.target.value); resetPage() }}
            />
          </div>

          {/* 필터 */}
          <div className="flex gap-2 flex-wrap">
            <select
              className="text-sm border rounded-md px-2 py-1.5"
              value={filterDong}
              onChange={e => { setFilterDong(e.target.value); resetPage() }}
            >
              <option value="">동 전체</option>
              {DONGS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>

            <select
              className="text-sm border rounded-md px-2 py-1.5"
              value={filterRole}
              onChange={e => { setFilterRole(e.target.value); resetPage() }}
            >
              <option value="">역할 전체</option>
              {ALL_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>

            <select
              className="text-sm border rounded-md px-2 py-1.5"
              value={filterStatus}
              onChange={e => { setFilterStatus(e.target.value); resetPage() }}
            >
              <option value="">상태 전체</option>
              {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>

            <button
              onClick={() => { setSearch(''); setFilterDong(''); setFilterRole(''); setFilterStatus(''); setPage(1) }}
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 px-2 py-1 border rounded-md"
            >
              <X className="h-3 w-3" /> 초기화
            </button>

            <button onClick={loadMembers} className="ml-auto text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
              <RefreshCw className="h-3 w-3" /> 새로고침
            </button>
          </div>
        </div>

        {/* 테이블 */}
        <div className="flex-1 overflow-auto">
          {listLoading ? (
            <div className="flex items-center justify-center h-40 text-sm text-gray-400">로딩 중…</div>
          ) : members.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm text-gray-400">검색 결과가 없습니다.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr className="text-left text-xs text-gray-500 font-medium">
                  <th className="px-4 py-3">이름</th>
                  <th className="px-4 py-3">전화번호</th>
                  <th className="px-4 py-3">동</th>
                  <th className="px-4 py-3">역할</th>
                  <th className="px-4 py-3">상태</th>
                  <th className="px-4 py-3 text-right">TP 잔액</th>
                  <th className="px-4 py-3">가입일</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {members.map(m => (
                  <tr
                    key={m.id}
                    onClick={() => setSelectedId(m.id)}
                    className={`cursor-pointer hover:bg-blue-50 transition-colors ${selectedId === m.id ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-4 py-3 font-medium">{m.name}</td>
                    <td className="px-4 py-3 text-gray-600 tabular-nums">{m.phone}</td>
                    <td className="px-4 py-3 text-gray-600">{m.dong}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {m.roles.map(r => (
                          <span key={r} className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${ROLE_COLORS[r] ?? 'bg-gray-100 text-gray-600'}`}>
                            {ROLE_LABELS[r] ?? r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[m.status] ?? ''}`}>
                        {STATUS_LABELS[m.status] ?? m.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">{fmtTP(m.tpBalance)}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{fmtDate(m.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="shrink-0 flex items-center justify-center gap-3 px-6 py-3 border-t bg-white text-sm">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-gray-600">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* ── 우측: 상세 패널 ──────────────────────────────────────────────── */}
      {selectedId && (
        <div className="fixed right-0 top-0 h-full w-[480px] bg-white border-l shadow-2xl z-40 flex flex-col">

          {/* 패널 헤더 */}
          <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
            <div>
              <p className="font-semibold text-base">{detail?.name ?? '…'}</p>
              <p className="text-xs text-muted-foreground">{detail?.phone}</p>
            </div>
            <button onClick={() => setSelectedId(null)} className="p-1 rounded hover:bg-gray-100">
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* 탭 */}
          <div className="flex border-b shrink-0">
            {([['info', '기본 정보'], ['tp', 'TP · 잔액'], ['security', '보안']] as const).map(([t, label]) => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                {label}
              </button>
            ))}
          </div>

          {/* 패널 본문 */}
          <div className="flex-1 overflow-y-auto">
            {detailLoading ? (
              <div className="flex items-center justify-center h-40 text-sm text-gray-400">로딩 중…</div>
            ) : !detail ? null : (

              <>
                {/* ── 기본 정보 탭 ────────────────────────────────────── */}
                {tab === 'info' && (
                  <div className="p-5 space-y-4">
                    {/* 읽기전용 메타 */}
                    <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50 rounded-xl p-3">
                      <div><span className="text-gray-400">가입일</span><br /><span className="font-medium">{fmtDate(detail.createdAt)}</span></div>
                      <div><span className="text-gray-400">출처</span><br /><span className="font-medium">{detail.syncSource === 'SHEET' ? '시트 가져오기' : '직접 가입'}</span></div>
                      <div><span className="text-gray-400">평균 별점</span><br /><span className="font-medium">★ {Number(detail.avgRating).toFixed(1)} ({detail.ratingCount}건)</span></div>
                      <div><span className="text-gray-400">마지막 동기화</span><br /><span className="font-medium">{detail.lastSyncedAt ? fmtDate(detail.lastSyncedAt) : '-'}</span></div>
                    </div>

                    {/* 이름 */}
                    <label className="block">
                      <span className="text-xs font-medium text-gray-600">이름</span>
                      <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                    </label>

                    {/* 전화번호 */}
                    <label className="block">
                      <span className="text-xs font-medium text-gray-600">전화번호</span>
                      <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                    </label>

                    {/* 생년월일 */}
                    <label className="block">
                      <span className="text-xs font-medium text-gray-600">생년월일 (YYYY-MM-DD)</span>
                      <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="예: 1945-03-15"
                        value={form.birthDate} onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))} />
                    </label>

                    {/* 동 */}
                    <label className="block">
                      <span className="text-xs font-medium text-gray-600">동</span>
                      <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={form.dong} onChange={e => setForm(f => ({ ...f, dong: e.target.value }))}>
                        {DONGS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </label>

                    {/* 역할 */}
                    <div>
                      <span className="text-xs font-medium text-gray-600">역할</span>
                      <div className="mt-2 flex gap-2 flex-wrap">
                        {ALL_ROLES.map(r => (
                          <label key={r} className="flex items-center gap-1.5 cursor-pointer select-none">
                            <input type="checkbox" className="rounded"
                              checked={form.roles.includes(r)}
                              onChange={e => setForm(f => ({
                                ...f,
                                roles: e.target.checked
                                  ? [...f.roles, r]
                                  : f.roles.filter(x => x !== r),
                              }))} />
                            <span className="text-sm">{ROLE_LABELS[r]}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* 상태 */}
                    <label className="block">
                      <span className="text-xs font-medium text-gray-600">상태</span>
                      <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                        {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                      </select>
                    </label>

                    {/* 저장 버튼 */}
                    <button onClick={handleSave} disabled={saving}
                      className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-medium transition-colors">
                      <Save className="h-4 w-4" />
                      {saving ? '저장 중…' : '변경사항 저장'}
                    </button>

                    {saveMsg && (
                      <p className={`text-sm text-center ${saveMsg.startsWith('오류') ? 'text-red-500' : 'text-green-600'}`}>
                        {saveMsg}
                      </p>
                    )}
                  </div>
                )}

                {/* ── TP · 잔액 탭 ────────────────────────────────────── */}
                {tab === 'tp' && (
                  <div className="p-5 space-y-5">
                    {/* 잔액 카드 */}
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: '현재 잔액',   value: fmtTP(detail.tpBalance),      color: 'text-blue-700' },
                        { label: '총 획득',      value: fmtTP(detail.lifetimeEarned), color: 'text-green-700' },
                        { label: '총 사용',      value: fmtTP(detail.lifetimeSpent),  color: 'text-gray-700' },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                          <p className="text-xs text-gray-400">{label}</p>
                          <p className={`text-sm font-bold mt-1 ${color}`}>{value}</p>
                        </div>
                      ))}
                    </div>

                    {detail.tpExpiresAt && (
                      <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                        TP 만료일: {fmtDate(detail.tpExpiresAt)}
                      </p>
                    )}

                    <hr />

                    {/* TP 조정 */}
                    <div className="space-y-3">
                      <p className="text-sm font-semibold">TP 직접 조정</p>

                      {/* 지급/차감 토글 */}
                      <div className="flex rounded-lg border overflow-hidden text-sm">
                        {(['add', 'subtract'] as const).map((d, i) => (
                          <button key={d} onClick={() => setTpDirection(d)}
                            className={`flex-1 py-2 font-medium transition-colors ${tpDirection === d
                              ? d === 'add' ? 'bg-green-600 text-white' : 'bg-red-500 text-white'
                              : 'text-gray-500 hover:bg-gray-50'
                            } ${i === 0 ? 'border-r' : ''}`}>
                            {d === 'add' ? '+ 지급' : '− 차감'}
                          </button>
                        ))}
                      </div>

                      <input
                        type="number" min="0.1" step="0.1"
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="조정 금액 (TP)"
                        value={tpAmount}
                        onChange={e => setTpAmount(e.target.value)}
                      />

                      <input
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="사유 (예: 사회적처방 지급)"
                        value={tpReason}
                        onChange={e => setTpReason(e.target.value)}
                      />

                      <button onClick={handleTpAdjust} disabled={tpSaving || !tpAmount}
                        className={`w-full py-2.5 rounded-xl text-sm font-medium text-white transition-colors disabled:opacity-50 ${
                          tpDirection === 'add' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'
                        }`}>
                        {tpSaving ? '처리 중…' : tpDirection === 'add' ? 'TP 지급' : 'TP 차감'}
                      </button>

                      {tpMsg && (
                        <p className={`text-sm text-center ${tpMsg.startsWith('오류') ? 'text-red-500' : 'text-green-600'}`}>
                          {tpMsg}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* ── 보안 탭 ─────────────────────────────────────────── */}
                {tab === 'security' && (
                  <div className="p-5 space-y-5">

                    {/* 비밀번호 초기화 */}
                    <div className="border rounded-xl p-4 space-y-3">
                      <div>
                        <p className="text-sm font-semibold">비밀번호 초기화</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          생년월일 6자리(YYMMDD)로 임시 비밀번호를 설정합니다.
                          {detail.birthDate
                            ? ` 예상 임시 비밀번호: ${detail.birthDate.slice(2, 8)}`
                            : ' (생년월일 미등록 시 불가)'}
                        </p>
                      </div>
                      <button
                        onClick={handleResetPw}
                        disabled={resetLoading || !detail.birthDate}
                        className="w-full flex items-center justify-center gap-2 border border-gray-300 hover:bg-gray-50 disabled:opacity-40 rounded-xl py-2.5 text-sm font-medium transition-colors"
                      >
                        <KeyRound className="h-4 w-4" />
                        {resetLoading ? '처리 중…' : '비밀번호 초기화'}
                      </button>
                      {resetResult && (
                        <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${
                          resetResult.startsWith('오류') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                        }`}>
                          <Check className="h-4 w-4 shrink-0" />
                          {resetResult}
                        </div>
                      )}
                    </div>

                    {/* 탈퇴 처리 */}
                    <div className="border border-red-200 rounded-xl p-4 space-y-3">
                      <div>
                        <p className="text-sm font-semibold text-red-700">탈퇴 처리</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          회원 상태를 <strong>탈퇴</strong>로 변경합니다. 데이터는 보존됩니다.
                        </p>
                      </div>
                      {form.status === 'WITHDRAWN' ? (
                        <p className="text-sm text-gray-500 text-center py-1">이미 탈퇴 처리된 회원입니다.</p>
                      ) : !withdrawConfirm ? (
                        <button
                          onClick={() => setWithdrawConfirm(true)}
                          className="w-full flex items-center justify-center gap-2 border border-red-300 text-red-600 hover:bg-red-50 rounded-xl py-2.5 text-sm font-medium transition-colors"
                        >
                          <UserX className="h-4 w-4" />
                          탈퇴 처리
                        </button>
                      ) : (
                        <div className="bg-red-50 rounded-xl p-3 space-y-3">
                          <div className="flex items-start gap-2 text-sm text-red-700">
                            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                            <span><strong>{detail.name}</strong> 회원을 탈퇴 처리하시겠습니까?</span>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => setWithdrawConfirm(false)}
                              className="flex-1 py-2 border rounded-lg text-sm text-gray-600 hover:bg-white transition-colors">
                              취소
                            </button>
                            <button onClick={handleWithdraw} disabled={withdrawLoading}
                              className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                              {withdrawLoading ? '처리 중…' : '확인'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
