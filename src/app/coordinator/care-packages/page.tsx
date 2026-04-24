'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, HeartHandshake, Plus, CheckCircle, ChevronRight, Clock, Coins, User, Building2 } from 'lucide-react'
import Link from 'next/link'

const CATEGORIES = [
  { value: 'HOUSEKEEPING', label: '🏠 가사지원' },
  { value: 'COMPANION', label: '💬 말벗' },
  { value: 'MEAL', label: '🍱 식사지원' },
  { value: 'MEDICAL_ESCORT', label: '🏥 의료동행' },
  { value: 'TRANSPORT', label: '🚗 이동지원' },
  { value: 'CHILDCARE', label: '👶 아이돌봄' },
  { value: 'DIGITAL_HELP', label: '📱 디지털지원' },
  { value: 'EDUCATION', label: '📚 교육' },
  { value: 'OTHER', label: '✨ 기타' },
]

const STATUS_LABEL: Record<string, string> = {
  DRAFT: '초안', ACTIVE: '진행중', COMPLETED: '완료', SUSPENDED: '중단', CANCELLED: '취소',
}
const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  ACTIVE: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
  SUSPENDED: 'bg-yellow-100 text-yellow-700',
  CANCELLED: 'bg-red-100 text-red-600',
}
const CAT_LABEL: Record<string, string> = Object.fromEntries(CATEGORIES.map(c => [c.value, c.label]))

export default function CarePackagesPage() {
  const [packages, setPackages] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [orgs, setOrgs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('ACTIVE')

  const [form, setForm] = useState({
    title: '',
    category: 'HOUSEKEEPING',
    description: '',
    recipientId: '',
    organizationId: '',
    dailyHours: 3,
    totalDays: 30,
    startDate: '',
    endDate: '',
    note: '',
  })
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  // 검색
  const [recipientSearch, setRecipientSearch] = useState('')
  const [orgSearch, setOrgSearch] = useState('')

  const totalTcAmount = form.dailyHours * form.totalDays

  useEffect(() => {
    Promise.all([
      fetch(`/api/care-packages?status=${statusFilter}`).then(r => r.json()),
      fetch('/api/coordinator/members').then(r => r.json()),
      fetch('/api/organizations').then(r => r.json()),
    ]).then(([pd, md, od]) => {
      setPackages(pd.packages ?? [])
      setMembers(md.members ?? [])
      setOrgs(od.organizations ?? [])
      setLoading(false)
    })
  }, [statusFilter])

  // 종료일 자동 계산
  useEffect(() => {
    if (form.startDate && form.totalDays > 0) {
      const end = new Date(form.startDate)
      end.setDate(end.getDate() + form.totalDays - 1)
      setForm(f => ({ ...f, endDate: end.toISOString().slice(0, 10) }))
    }
  }, [form.startDate, form.totalDays])

  const filteredRecipients = members.filter(m =>
    !recipientSearch || m.name.includes(recipientSearch) || m.phone?.includes(recipientSearch)
  )
  const filteredOrgs = orgs.filter(o =>
    !orgSearch || o.name.includes(orgSearch) || o.dong.includes(orgSearch)
  )

  async function handleCreate() {
    if (!form.recipientId || !form.title || !form.startDate) return
    setSaving(true)
    setResult(null)

    const res = await fetch('/api/care-packages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        totalTcAmount,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate || form.startDate).toISOString(),
        organizationId: form.organizationId || undefined,
      }),
    })

    if (res.ok) {
      const d = await res.json()
      setResult({ ok: true, msg: `"${d.pkg.title}" 패키지 생성 완료 (${totalTcAmount} TC)` })
      setForm({
        title: '', category: 'HOUSEKEEPING', description: '',
        recipientId: '', organizationId: '', dailyHours: 3,
        totalDays: 30, startDate: '', endDate: '', note: '',
      })
      setRecipientSearch('')
      setOrgSearch('')
      // 목록 갱신
      fetch(`/api/care-packages?status=${statusFilter}`).then(r => r.json())
        .then(d => setPackages(d.packages ?? []))
    } else {
      const d = await res.json()
      setResult({ ok: false, msg: d.error ?? '생성 실패' })
    }
    setSaving(false)
  }

  const selectedRecipient = members.find(m => m.id === form.recipientId)
  const selectedOrg = orgs.find(o => o.id === form.organizationId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <HeartHandshake className="h-6 w-6 text-rose-500" /> 돌봄 패키지 관리
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          단체가 수혜자에게 TC를 배분하고 복수의 제공자가 나눠 이행하는 패키지 서비스
        </p>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">패키지 목록</TabsTrigger>
          <TabsTrigger value="new">새 패키지 생성</TabsTrigger>
        </TabsList>

        {/* ── 목록 ── */}
        <TabsContent value="list" className="mt-4 space-y-4">
          <div className="flex gap-2">
            {['ACTIVE', 'COMPLETED', 'DRAFT', 'SUSPENDED'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${statusFilter === s ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-300'}`}>
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />불러오는 중…
            </div>
          ) : packages.length === 0 ? (
            <p className="text-center py-10 text-muted-foreground">패키지가 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {packages.map(pkg => {
                const pct = Number(pkg.totalTcAmount) > 0
                  ? Math.round((Number(pkg.usedTcAmount) / Number(pkg.totalTcAmount)) * 100)
                  : 0
                const completedSessions = pkg.sessions?.filter((s: any) => s.status === 'COMPLETED').length ?? 0
                const totalSessions = pkg.sessions?.length ?? 0

                return (
                  <Card key={pkg.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[pkg.status]}`}>
                              {STATUS_LABEL[pkg.status]}
                            </span>
                            <span className="text-xs text-muted-foreground">{CAT_LABEL[pkg.category] ?? pkg.category}</span>
                          </div>
                          <h3 className="font-semibold mt-1">{pkg.title}</h3>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              수혜: <strong className="text-foreground ml-0.5">{pkg.recipient?.name}</strong> ({pkg.recipient?.dong})
                            </span>
                            {pkg.organization && (
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3 w-3 text-blue-500" />
                                <span className="text-blue-600">{pkg.organization?.name}</span>
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {pkg.dailyHours}h × {pkg.totalDays}일
                            </span>
                          </div>

                          {/* TC 진행 바 */}
                          <div className="mt-2 space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>TC 사용: {Number(pkg.usedTcAmount).toFixed(1)} / {Number(pkg.totalTcAmount).toFixed(1)} TC</span>
                              <span>{pct}%</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-blue-500' : 'bg-green-500'}`}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                          </div>

                          {/* 세션 요약 */}
                          {totalSessions > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              세션: {completedSessions}/{totalSessions} 완료
                            </p>
                          )}
                        </div>

                        <Link href={`/coordinator/care-packages/${pkg.id}`}>
                          <Button variant="outline" size="sm" className="shrink-0">
                            관리 <ChevronRight className="h-3 w-3 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ── 새 패키지 생성 ── */}
        <TabsContent value="new" className="mt-4">
          <div className="max-w-2xl space-y-4">

            {/* 수혜자 선택 */}
            <Card>
              <CardHeader><CardTitle className="text-base">① 수혜자 선택 *</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Input placeholder="이름 또는 전화번호" value={recipientSearch}
                    onChange={e => setRecipientSearch(e.target.value)} />
                </div>
                <div className="border rounded-md max-h-40 overflow-y-auto">
                  {filteredRecipients.slice(0, 10).map(m => (
                    <button key={m.id} type="button" onClick={() => setForm(f => ({ ...f, recipientId: m.id }))}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors ${form.recipientId === m.id ? 'bg-rose-50 text-rose-700 font-medium' : 'hover:bg-muted'}`}>
                      <span className="font-medium">{m.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">{m.dong} · {m.phone}</span>
                      <span className="text-xs text-amber-600 ml-2">잔액 {Number(m.tcBalance).toFixed(1)} TC</span>
                    </button>
                  ))}
                </div>
                {selectedRecipient && (
                  <div className="bg-rose-50 border border-rose-200 rounded-md px-3 py-2 text-sm">
                    ✓ <strong>{selectedRecipient.name}</strong> ({selectedRecipient.dong}) 선택됨
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 배분 단체 선택 */}
            <Card>
              <CardHeader><CardTitle className="text-base">② 배분 단체 선택 (선택사항)</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Input placeholder="단체명 또는 동 검색" value={orgSearch}
                  onChange={e => setOrgSearch(e.target.value)} />
                <div className="border rounded-md max-h-36 overflow-y-auto">
                  <button type="button" onClick={() => setForm(f => ({ ...f, organizationId: '' }))}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${!form.organizationId ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-muted'}`}>
                    <span className="text-muted-foreground">없음 (개인 간 거래)</span>
                  </button>
                  {filteredOrgs.slice(0, 10).map(o => (
                    <button key={o.id} type="button" onClick={() => setForm(f => ({ ...f, organizationId: o.id }))}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors ${form.organizationId === o.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'hover:bg-muted'}`}>
                      <span className="font-medium">{o.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">{o.dong}</span>
                      <span className="text-xs text-amber-600 ml-2">잔액 {Number(o.tcBalance).toFixed(1)} TC</span>
                    </button>
                  ))}
                </div>
                {selectedOrg && (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-md px-3 py-2 text-sm">
                    🏢 <strong>{selectedOrg.name}</strong> ({selectedOrg.dong}) 선택됨
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 패키지 내용 */}
            <Card>
              <CardHeader><CardTitle className="text-base">③ 패키지 내용</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>패키지 제목 *</Label>
                  <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="예: A어르신 퇴원 후 30일 가사지원 패키지" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>서비스 유형</Label>
                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>시작일 *</Label>
                    <Input type="date" value={form.startDate}
                      onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>
                      하루 서비스 시간
                      <span className="text-muted-foreground font-normal ml-1 text-xs">{form.dailyHours}시간</span>
                    </Label>
                    <input type="range" min={0.5} max={8} step={0.5} value={form.dailyHours}
                      onChange={e => setForm(f => ({ ...f, dailyHours: Number(e.target.value) }))}
                      className="w-full" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>
                      총 일수
                      <span className="text-muted-foreground font-normal ml-1 text-xs">{form.totalDays}일</span>
                    </Label>
                    <input type="range" min={1} max={365} step={1} value={form.totalDays}
                      onChange={e => setForm(f => ({ ...f, totalDays: Number(e.target.value) }))}
                      className="w-full" />
                  </div>
                </div>

                {/* TC 자동 계산 */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
                  <div className="text-sm text-amber-700">
                    <p className="font-medium">배분 TC 자동 계산</p>
                    <p className="text-xs mt-0.5">{form.dailyHours}시간 × {form.totalDays}일 × 1 TC/h</p>
                  </div>
                  <div className="text-2xl font-bold text-amber-600">{totalTcAmount} TC</div>
                </div>

                <div className="space-y-1.5">
                  <Label>메모</Label>
                  <textarea value={form.description} rows={2}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="예: 병원 퇴원 후 회복 기간 가사지원"
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" />
                </div>
              </CardContent>
            </Card>

            {result && (
              <div className={`flex items-center gap-2 rounded-md px-4 py-3 text-sm ${result.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {result.ok && <CheckCircle className="h-4 w-4 shrink-0" />}
                {result.msg}
              </div>
            )}

            <Button className="w-full" size="lg" onClick={handleCreate}
              disabled={saving || !form.recipientId || !form.title || !form.startDate}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              <Plus className="h-4 w-4 mr-1" /> 패키지 생성
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
