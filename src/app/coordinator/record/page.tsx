'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, CheckCircle, PenLine, Search, Building2, User } from 'lucide-react'

const CATEGORIES = [
  { value: 'TRANSPORT', label: '🚗 이동지원' },
  { value: 'SHOPPING', label: '🛒 장보기' },
  { value: 'COMPANION', label: '💬 말벗' },
  { value: 'MEAL', label: '🍱 식사지원' },
  { value: 'HOUSEKEEPING', label: '🏠 가사지원' },
  { value: 'MEDICAL_ESCORT', label: '🏥 의료동행' },
  { value: 'EDUCATION', label: '📚 교육' },
  { value: 'DIGITAL_HELP', label: '📱 디지털지원' },
  { value: 'REPAIR', label: '🔧 수리' },
  { value: 'CHILDCARE', label: '👶 아이돌봄' },
  { value: 'LEGAL_CONSULT', label: '⚖️ 법률상담' },
  { value: 'HEALTH_CONSULT', label: '💊 건강상담' },
  { value: 'ADMINISTRATIVE', label: '📋 행정보조' },
  { value: 'COMMUNITY_EVENT', label: '🎉 공동체행사' },
  { value: 'OTHER', label: '✨ 기타' },
]

const TX_TYPES = [
  { value: 'PEER_TO_PEER', label: '개인 ↔ 개인 (P2P)' },
  { value: 'ORG_TO_INDIVIDUAL', label: '단체 → 개인 (단체가 서비스 제공)' },
  { value: 'INDIVIDUAL_TO_ORG', label: '개인 → 단체 (개인이 단체에 제공)' },
  { value: 'PUBLIC_SERVICE', label: '공공서비스' },
]

export default function RecordTransactionPage() {
  const [members, setMembers] = useState<any[]>([])
  const [orgs, setOrgs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // 거래 유형
  const [txType, setTxType] = useState('ORG_TO_INDIVIDUAL')

  // 제공자 (개인 or 단체)
  const [providerType, setProviderType] = useState<'member' | 'org'>('org')
  const [providerSearch, setProviderSearch] = useState('')
  const [selectedProvider, setSelectedProvider] = useState<any>(null)  // member or org

  // 수혜자 (항상 개인)
  const [receiverSearch, setReceiverSearch] = useState('')
  const [selectedReceiver, setSelectedReceiver] = useState<any>(null)

  // 거래 내용
  const [form, setForm] = useState({
    category: 'EDUCATION',
    durationMinutes: 60,
    tcPerHour: 1.0,
    note: '',
    completedAt: new Date().toISOString().slice(0, 16),
  })

  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/coordinator/members').then(r => r.json()),
      fetch('/api/organizations').then(r => r.json()),
    ]).then(([md, od]) => {
      setMembers(md.members ?? [])
      setOrgs(od.organizations ?? [])
      setLoading(false)
    })
  }, [])

  // txType이 바뀌면 제공자 유형 자동 결정
  useEffect(() => {
    if (txType === 'ORG_TO_INDIVIDUAL') setProviderType('org')
    else if (txType === 'INDIVIDUAL_TO_ORG') setProviderType('member')
    else setProviderType('member')
    setSelectedProvider(null)
    setProviderSearch('')
  }, [txType])

  const tcAmount = parseFloat(((form.durationMinutes / 60) * form.tcPerHour).toFixed(2))

  const filteredProviders = providerType === 'org'
    ? orgs.filter(o => !providerSearch || o.name.includes(providerSearch) || o.dong.includes(providerSearch))
    : members.filter(m => !providerSearch || m.name.includes(providerSearch) || m.phone?.includes(providerSearch))

  const filteredReceivers = members.filter(m =>
    !receiverSearch || m.name.includes(receiverSearch) || m.phone?.includes(receiverSearch)
  )

  async function handleSave() {
    if (!selectedReceiver) return
    if (txType !== 'PUBLIC_SERVICE' && !selectedProvider) return

    setSaving(true)
    setResult(null)

    const body: any = {
      txType,
      category: form.category,
      durationMinutes: form.durationMinutes,
      tcAmount,
      note: form.note,
      completedAt: new Date(form.completedAt).toISOString(),
      receiverId: selectedReceiver.id,
    }

    if (providerType === 'org' && selectedProvider) {
      body.organizationId = selectedProvider.id
    } else if (providerType === 'member' && selectedProvider) {
      body.providerId = selectedProvider.id
    }

    const res = await fetch('/api/coordinator/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      const d = await res.json()
      setResult({ ok: true, msg: `거래 등록 완료! ${tcAmount} TC (${form.durationMinutes}분)` })
      setSelectedProvider(null)
      setSelectedReceiver(null)
      setProviderSearch('')
      setReceiverSearch('')
      setForm(f => ({ ...f, note: '' }))
    } else {
      const d = await res.json()
      setResult({ ok: false, msg: d.error ?? '등록 실패' })
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />불러오는 중…
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <PenLine className="h-6 w-6" /> 완료 거래 직접 입력
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          이미 완료된 서비스를 거래 기록으로 등록합니다 (TC 자동 계산)
        </p>
      </div>

      {/* Step 1: 거래 유형 */}
      <Card>
        <CardHeader><CardTitle className="text-base">① 거래 유형 선택</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {TX_TYPES.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTxType(t.value)}
                className={`text-left px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${
                  txType === t.value
                    ? 'bg-indigo-50 border-indigo-400 text-indigo-800'
                    : 'bg-white border-gray-200 hover:border-indigo-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Step 2: 제공자 */}
        {txType !== 'PUBLIC_SERVICE' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                {providerType === 'org'
                  ? <><Building2 className="h-4 w-4 text-blue-500" /> ② 제공 단체</>
                  : <><User className="h-4 w-4" /> ② 제공자 (회원)</>
                }
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={providerType === 'org' ? '단체명 또는 동 검색' : '이름 또는 전화번호'}
                  value={providerSearch}
                  onChange={e => setProviderSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto border rounded-md">
                {filteredProviders.slice(0, 20).map((item: any) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedProvider(item)}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      selectedProvider?.id === item.id
                        ? 'bg-indigo-50 text-indigo-700 font-medium'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <span className="font-medium">{item.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">{item.dong}</span>
                    {item.phone && <span className="text-xs text-muted-foreground ml-1">{item.phone}</span>}
                  </button>
                ))}
                {filteredProviders.length === 0 && (
                  <p className="text-xs text-muted-foreground px-3 py-4 text-center">검색 결과 없음</p>
                )}
              </div>
              {selectedProvider && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-md px-3 py-2 text-sm">
                  ✓ <strong>{selectedProvider.name}</strong> ({selectedProvider.dong}) 선택됨
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: 수혜자 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              {txType !== 'PUBLIC_SERVICE' ? '③ 수혜자 (서비스 받은 분)' : '② 수혜자 (서비스 받은 분)'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="이름 또는 전화번호"
                value={receiverSearch}
                onChange={e => setReceiverSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto border rounded-md">
              {filteredReceivers.slice(0, 20).map((m: any) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedReceiver(m)}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    selectedReceiver?.id === m.id
                      ? 'bg-green-50 text-green-700 font-medium'
                      : 'hover:bg-muted'
                  }`}
                >
                  <span className="font-medium">{m.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">{m.dong}</span>
                  <span className="text-xs text-muted-foreground ml-1">{m.phone}</span>
                  <span className="text-xs text-amber-600 ml-2">잔액 {Number(m.tcBalance).toFixed(1)} TC</span>
                </button>
              ))}
              {filteredReceivers.length === 0 && (
                <p className="text-xs text-muted-foreground px-3 py-4 text-center">검색 결과 없음</p>
              )}
            </div>
            {selectedReceiver && (
              <div className="bg-green-50 border border-green-200 rounded-md px-3 py-2 text-sm">
                ✓ <strong>{selectedReceiver.name}</strong> ({selectedReceiver.dong}) 선택됨
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Step 4: 서비스 내용 */}
      <Card>
        <CardHeader><CardTitle className="text-base">④ 서비스 내용</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>서비스 유형 *</Label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>완료 일시 *</Label>
              <Input
                type="datetime-local"
                value={form.completedAt}
                onChange={e => setForm(f => ({ ...f, completedAt: e.target.value }))}
                max={new Date().toISOString().slice(0, 16)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>
                소요 시간
                <input
                  type="range" min={15} max={480} step={15}
                  value={form.durationMinutes}
                  onChange={e => setForm(f => ({ ...f, durationMinutes: Number(e.target.value) }))}
                  className="w-full mt-1"
                />
                <span className="text-muted-foreground font-normal text-sm block">
                  {form.durationMinutes >= 60
                    ? `${Math.floor(form.durationMinutes / 60)}시간${form.durationMinutes % 60 ? ` ${form.durationMinutes % 60}분` : ''}`
                    : `${form.durationMinutes}분`}
                </span>
              </Label>
            </div>
            <div className="space-y-1.5">
              <Label>TC 단가 (시간당)</Label>
              <Input
                type="number" min={0.5} max={3} step={0.5}
                value={form.tcPerHour}
                onChange={e => setForm(f => ({ ...f, tcPerHour: Number(e.target.value) }))}
              />
            </div>
          </div>

          {/* TC 계산 결과 */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-amber-700">예상 TC</span>
            <span className="text-xl font-bold text-amber-600">{tcAmount.toFixed(2)} TC</span>
          </div>

          <div className="space-y-1.5">
            <Label>메모 / 비고</Label>
            <textarea
              value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              rows={2}
              placeholder="예: 상무2동 행정복지센터 주민교육 1시간 참여"
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* 요약 확인 */}
      {(selectedProvider || txType === 'PUBLIC_SERVICE') && selectedReceiver && (
        <Card className="border-indigo-200 bg-indigo-50/50">
          <CardContent className="pt-4">
            <p className="text-sm font-semibold text-indigo-800 mb-2">📋 등록 요약</p>
            <div className="text-sm space-y-1 text-indigo-700">
              <p>• 유형: {TX_TYPES.find(t => t.value === txType)?.label}</p>
              {selectedProvider && <p>• 제공: <strong>{selectedProvider.name}</strong> ({selectedProvider.dong})</p>}
              <p>• 수혜: <strong>{selectedReceiver.name}</strong> ({selectedReceiver.dong})</p>
              <p>• 서비스: {CATEGORIES.find(c => c.value === form.category)?.label} / {form.durationMinutes}분</p>
              <p>• TC: <strong>{tcAmount.toFixed(2)} TC</strong> 발생</p>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <div className={`flex items-center gap-2 rounded-md px-4 py-3 text-sm ${result.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {result.ok && <CheckCircle className="h-4 w-4 shrink-0" />}
          {result.msg}
        </div>
      )}

      <Button
        className="w-full"
        size="lg"
        onClick={handleSave}
        disabled={
          saving ||
          !selectedReceiver ||
          (txType !== 'PUBLIC_SERVICE' && !selectedProvider) ||
          !form.completedAt
        }
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        거래 등록하기
      </Button>
    </div>
  )
}
