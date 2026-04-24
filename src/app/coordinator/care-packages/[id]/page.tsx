'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Loader2, ArrowLeft, Plus, CheckCircle, XCircle,
  User, Building2, Clock, Coins, CalendarDays,
} from 'lucide-react'

const CAT_LABEL: Record<string, string> = {
  HOUSEKEEPING:'🏠 가사지원', COMPANION:'💬 말벗', MEAL:'🍱 식사지원',
  MEDICAL_ESCORT:'🏥 의료동행', TRANSPORT:'🚗 이동지원', CHILDCARE:'👶 아이돌봄',
  DIGITAL_HELP:'📱 디지털지원', EDUCATION:'📚 교육', OTHER:'✨ 기타',
}
const SESSION_COLOR: Record<string, string> = {
  SCHEDULED: 'bg-blue-50 border-blue-200',
  COMPLETED: 'bg-green-50 border-green-200',
  CANCELLED: 'bg-gray-50 border-gray-200',
  NO_SHOW: 'bg-red-50 border-red-200',
}
const SESSION_LABEL: Record<string, string> = {
  SCHEDULED: '예정', COMPLETED: '완료', CANCELLED: '취소', NO_SHOW: '미이행',
}

export default function CarePackageDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [pkg, setPkg] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState<string | null>(null)

  // 세션 추가 폼
  const [showAddForm, setShowAddForm] = useState(false)
  const [providerSearch, setProviderSearch] = useState('')
  const [addForm, setAddForm] = useState({
    providerId: '',
    scheduledAt: '',
    durationMinutes: 180,  // 3시간 기본
    tcAmount: 3,
    note: '',
  })
  const [addSaving, setAddSaving] = useState(false)
  const [addResult, setAddResult] = useState<{ ok: boolean; msg: string } | null>(null)

  async function loadPackage() {
    const res = await fetch(`/api/care-packages?status=ACTIVE,COMPLETED,DRAFT,SUSPENDED`)
    const d = await res.json()
    const found = (d.packages ?? []).find((p: any) => p.id === id)
    setPkg(found ?? null)
    setLoading(false)
  }

  useEffect(() => {
    Promise.all([
      loadPackage(),
      fetch('/api/coordinator/members').then(r => r.json()).then(d => setMembers(d.members ?? [])),
    ])
  }, [id])

  const filteredProviders = members.filter(m =>
    !providerSearch || m.name.includes(providerSearch) || m.phone?.includes(providerSearch)
  )
  const selectedProvider = members.find(m => m.id === addForm.providerId)

  async function handleAddSession() {
    if (!addForm.providerId || !addForm.scheduledAt) return
    setAddSaving(true)
    setAddResult(null)
    const res = await fetch(`/api/care-packages/${id}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...addForm,
        scheduledAt: new Date(addForm.scheduledAt).toISOString(),
      }),
    })
    if (res.ok) {
      setAddResult({ ok: true, msg: '세션 추가 완료' })
      setAddForm(f => ({ ...f, providerId: '', scheduledAt: '', note: '' }))
      setProviderSearch('')
      setShowAddForm(false)
      await loadPackage()
    } else {
      const d = await res.json()
      setAddResult({ ok: false, msg: typeof d.error === 'string' ? d.error : '추가 실패' })
    }
    setAddSaving(false)
  }

  async function handleComplete(sessionId: string) {
    setCompleting(sessionId)
    const res = await fetch(`/api/care-packages/${id}/sessions/${sessionId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    if (res.ok) {
      await loadPackage()
    } else {
      const d = await res.json()
      alert(d.error ?? '완료 처리 실패')
    }
    setCompleting(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />불러오는 중…
      </div>
    )
  }
  if (!pkg) return <p className="text-center py-10 text-muted-foreground">패키지를 찾을 수 없습니다.</p>

  const pct = Number(pkg.totalTcAmount) > 0
    ? Math.round((Number(pkg.usedTcAmount) / Number(pkg.totalTcAmount)) * 100)
    : 0
  const remainingTc = Number(pkg.totalTcAmount) - Number(pkg.usedTcAmount)
  const pendingTc = (pkg.sessions ?? [])
    .filter((s: any) => s.status === 'SCHEDULED')
    .reduce((sum: number, s: any) => sum + Number(s.tcAmount), 0)
  const availableTc = remainingTc - pendingTc

  // 제공자별 집계
  const providerStats: Record<string, { name: string; dong: string; sessions: number; tc: number }> = {}
  for (const s of (pkg.sessions ?? [])) {
    if (s.status === 'COMPLETED' && s.provider) {
      if (!providerStats[s.provider.id]) {
        providerStats[s.provider.id] = { name: s.provider.name, dong: s.provider.dong, sessions: 0, tc: 0 }
      }
      providerStats[s.provider.id].sessions++
      providerStats[s.provider.id].tc += Number(s.tcAmount)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/coordinator/care-packages">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> 목록</Button>
        </Link>
        <h1 className="text-xl font-bold">{pkg.title}</h1>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          pkg.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
        }`}>{pkg.status === 'ACTIVE' ? '진행중' : pkg.status}</span>
      </div>

      {/* 패키지 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 space-y-1">
            <p className="text-xs text-muted-foreground">수혜자</p>
            <p className="font-semibold flex items-center gap-1.5">
              <User className="h-4 w-4" /> {pkg.recipient?.name}
            </p>
            <p className="text-xs text-muted-foreground">{pkg.recipient?.dong}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 space-y-1">
            <p className="text-xs text-muted-foreground">배분 단체</p>
            {pkg.organization ? (
              <>
                <p className="font-semibold flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-blue-500" />
                  <span className="text-blue-700">{pkg.organization.name}</span>
                </p>
                <p className="text-xs text-muted-foreground">{pkg.organization.dong}</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">없음</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 space-y-1">
            <p className="text-xs text-muted-foreground">서비스 일정</p>
            <p className="font-semibold flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {pkg.dailyHours}h/일 × {pkg.totalDays}일
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(pkg.startDate).toLocaleDateString('ko-KR')} ~{' '}
              {new Date(pkg.endDate).toLocaleDateString('ko-KR')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* TC 현황 */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Coins className="h-4 w-4 text-amber-500" /> TC 현황</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="bg-amber-50 rounded-lg p-3">
              <p className="text-xs text-amber-700">총 배분</p>
              <p className="text-xl font-bold text-amber-600">{Number(pkg.totalTcAmount).toFixed(0)}</p>
              <p className="text-xs text-amber-500">TC</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-xs text-green-700">사용 완료</p>
              <p className="text-xl font-bold text-green-600">{Number(pkg.usedTcAmount).toFixed(1)}</p>
              <p className="text-xs text-green-500">TC</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-blue-700">예정 사용</p>
              <p className="text-xl font-bold text-blue-600">{pendingTc.toFixed(1)}</p>
              <p className="text-xs text-blue-500">TC</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-600">잔여 가용</p>
              <p className="text-xl font-bold text-gray-700">{availableTc.toFixed(1)}</p>
              <p className="text-xs text-gray-500">TC</p>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>진행률</span><span>{pct}%</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full"
                style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 제공자별 실적 */}
      {Object.keys(providerStats).length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">제공자별 실적 (적립된 TC 저축)</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.values(providerStats).map((p, i) => (
                <div key={i} className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-indigo-500" />
                    <span className="font-medium text-sm">{p.name}</span>
                    <span className="text-xs text-muted-foreground">{p.dong}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-indigo-700">{p.tc.toFixed(1)} TC 적립</span>
                    <span className="text-xs text-muted-foreground ml-2">({p.sessions}회)</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2 px-1">
              💡 적립된 TC는 장기저축으로 분류됩니다 — 만 50세 이후 돌봄서비스 수령 시 사용 가능
            </p>
          </CardContent>
        </Card>
      )}

      {/* 세션 목록 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">세션 목록 ({pkg.sessions?.length ?? 0}건)</CardTitle>
            {pkg.status === 'ACTIVE' && (
              <Button size="sm" onClick={() => setShowAddForm(v => !v)}>
                <Plus className="h-4 w-4 mr-1" /> 세션 추가
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">

          {/* 세션 추가 폼 */}
          {showAddForm && (
            <div className="border-2 border-dashed border-indigo-200 rounded-lg p-4 space-y-3 bg-indigo-50/50">
              <p className="text-sm font-semibold text-indigo-800">새 세션 추가</p>

              <div>
                <Label className="text-xs">제공자 *</Label>
                <Input placeholder="이름 검색" value={providerSearch}
                  onChange={e => setProviderSearch(e.target.value)} className="mt-1 mb-1" />
                <div className="border rounded max-h-32 overflow-y-auto bg-white">
                  {filteredProviders.slice(0, 8).map(m => (
                    <button key={m.id} type="button" onClick={() => { setAddForm(f => ({ ...f, providerId: m.id })); setProviderSearch(m.name) }}
                      className={`w-full text-left px-3 py-1.5 text-sm ${addForm.providerId === m.id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-muted'}`}>
                      {m.name} <span className="text-xs text-muted-foreground">({m.dong})</span>
                    </button>
                  ))}
                </div>
                {selectedProvider && (
                  <p className="text-xs text-indigo-600 mt-1">✓ {selectedProvider.name} 선택됨</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">예정 일시 *</Label>
                  <Input type="datetime-local" value={addForm.scheduledAt}
                    onChange={e => setAddForm(f => ({ ...f, scheduledAt: e.target.value }))} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">시간 ({Math.floor(addForm.durationMinutes / 60)}시간{addForm.durationMinutes % 60 ? ` ${addForm.durationMinutes % 60}분` : ''})</Label>
                  <input type="range" min={30} max={480} step={30} value={addForm.durationMinutes}
                    onChange={e => setAddForm(f => ({
                      ...f,
                      durationMinutes: Number(e.target.value),
                      tcAmount: Number((Number(e.target.value) / 60).toFixed(2)),
                    }))}
                    className="w-full mt-2" />
                </div>
              </div>

              <div className="flex items-center justify-between bg-amber-50 rounded-md px-3 py-2">
                <span className="text-xs text-amber-700">이 세션 TC</span>
                <span className="font-bold text-amber-600">{addForm.tcAmount.toFixed(2)} TC</span>
                <span className="text-xs text-amber-500">(잔여 가용: {availableTc.toFixed(1)} TC)</span>
              </div>

              {addResult && (
                <p className={`text-xs ${addResult.ok ? 'text-green-700' : 'text-red-600'}`}>{addResult.msg}</p>
              )}

              <div className="flex gap-2">
                <Button onClick={handleAddSession} disabled={addSaving || !addForm.providerId || !addForm.scheduledAt} size="sm">
                  {addSaving && <Loader2 className="h-3 w-3 animate-spin mr-1" />} 추가
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowAddForm(false)}>취소</Button>
              </div>
            </div>
          )}

          {/* 세션 카드 */}
          {(pkg.sessions ?? []).length === 0 ? (
            <p className="text-center py-6 text-muted-foreground text-sm">등록된 세션이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {[...pkg.sessions].sort((a: any, b: any) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()).map((s: any) => (
                <div key={s.id} className={`flex items-center justify-between rounded-lg border px-4 py-3 ${SESSION_COLOR[s.status] ?? 'bg-white'}`}>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        s.status === 'COMPLETED' ? 'bg-green-200 text-green-800' :
                        s.status === 'SCHEDULED' ? 'bg-blue-200 text-blue-800' :
                        'bg-gray-200 text-gray-600'
                      }`}>{SESSION_LABEL[s.status]}</span>
                      <span className="text-sm font-medium">{s.provider?.name}</span>
                      <span className="text-xs text-muted-foreground">{s.provider?.dong}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {new Date(s.scheduledAt).toLocaleString('ko-KR', {
                          month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {s.durationMinutes >= 60
                          ? `${Math.floor(s.durationMinutes / 60)}시간${s.durationMinutes % 60 ? ` ${s.durationMinutes % 60}분` : ''}`
                          : `${s.durationMinutes}분`}
                      </span>
                      <span className="flex items-center gap-1 font-medium text-amber-600">
                        <Coins className="h-3 w-3" />
                        {Number(s.tcAmount).toFixed(1)} TC
                        {s.status === 'COMPLETED' && <span className="text-green-600 ml-1">저축완료</span>}
                      </span>
                    </div>
                    {s.note && <p className="text-xs text-muted-foreground">{s.note}</p>}
                  </div>

                  {s.status === 'SCHEDULED' && (
                    <Button size="sm" className="shrink-0"
                      onClick={() => handleComplete(s.id)}
                      disabled={completing === s.id}>
                      {completing === s.id
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <><CheckCircle className="h-3 w-3 mr-1" />완료</>}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
