'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Loader2, CheckCircle, AlertCircle, Printer } from 'lucide-react'

const CATEGORIES = [
  { value: 'TRANSPORT', label: '이동지원' }, { value: 'SHOPPING', label: '장보기' },
  { value: 'COMPANION', label: '말벗' }, { value: 'MEAL', label: '식사지원' },
  { value: 'HOUSEKEEPING', label: '가사지원' }, { value: 'MEDICAL_ESCORT', label: '의료동행' },
  { value: 'EDUCATION', label: '교육' }, { value: 'DIGITAL_HELP', label: '디지털지원' },
  { value: 'REPAIR', label: '수리' }, { value: 'CHILDCARE', label: '아이돌봄' },
  { value: 'LEGAL_CONSULT', label: '법률상담' }, { value: 'HEALTH_CONSULT', label: '건강상담' },
  { value: 'ADMINISTRATIVE', label: '행정보조' }, { value: 'COMMUNITY_EVENT', label: '공동체행사' },
  { value: 'OTHER', label: '기타' },
]

type EntryStatus = 'idle' | 'ok' | 'error'

interface OfflineEntry {
  id: string
  providerPhone: string
  receiverPhone: string
  category: string
  date: string
  durationMinutes: number
  note: string
  status: EntryStatus
  errorMsg: string
}

function emptyEntry(): OfflineEntry {
  return {
    id: crypto.randomUUID(),
    providerPhone: '', receiverPhone: '',
    category: 'SHOPPING', date: '',
    durationMinutes: 60, note: '',
    status: 'idle', errorMsg: '',
  }
}

export default function OfflineSyncPage() {
  const [entries, setEntries] = useState<OfflineEntry[]>([emptyEntry()])
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [coordId, setCoordId] = useState<string>('')

  // 세션에서 코디네이터 ID 가져오기
  useState(() => {
    fetch('/api/members/me').then(r => r.json()).then(d => setCoordId(d.member?.id ?? ''))
  })

  function updateEntry(id: string, field: keyof OfflineEntry, value: any) {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e))
  }

  function addEntry() {
    if (entries.length >= 50) return
    setEntries(prev => [...prev, emptyEntry()])
  }

  function removeEntry(id: string) {
    if (entries.length === 1) return
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  async function resolvePhone(phone: string): Promise<string | null> {
    const res = await fetch(`/api/members?phone=${encodeURIComponent(phone)}`)
    if (!res.ok) return null
    const d = await res.json()
    return d.members?.[0]?.id ?? null
  }

  async function handleSubmit() {
    if (!coordId) return
    setSubmitting(true)

    const results = await Promise.all(
      entries.map(async (entry) => {
        const [providerId, receiverId] = await Promise.all([
          resolvePhone(entry.providerPhone),
          resolvePhone(entry.receiverPhone),
        ])

        if (!providerId) return { id: entry.id, ok: false, msg: '제공자 전화번호를 찾을 수 없음' }
        if (!receiverId) return { id: entry.id, ok: false, msg: '수요자 전화번호를 찾을 수 없음' }

        const res = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            txType: 'PEER_TO_PEER',
            providerId,
            receiverId,
            category: entry.category,
            durationMinutes: entry.durationMinutes,
            verificationMethod: 'PAPER',
            coordinatorId: coordId,
            note: entry.note || '오프라인 수첩 등록',
          }),
        })

        if (!res.ok) {
          const d = await res.json()
          return { id: entry.id, ok: false, msg: d.error ?? '등록 실패' }
        }
        return { id: entry.id, ok: true, msg: '' }
      })
    )

    setEntries(prev => prev.map(e => {
      const result = results.find(r => r.id === e.id)
      return result ? { ...e, status: result.ok ? 'ok' : 'error', errorMsg: result.msg } : e
    }))

    const allOk = results.every(r => r.ok)
    if (allOk) setSubmitted(true)
    setSubmitting(false)
  }

  const okCount = entries.filter(e => e.status === 'ok').length
  const errCount = entries.filter(e => e.status === 'error').length

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">오프라인 일괄 등록</h1>
          <p className="text-muted-foreground text-sm mt-1">종이 수첩 거래를 한 번에 등록합니다 (최대 50건)</p>
        </div>
        {submitted && (
          <Button variant="outline" size="sm" onClick={() => window.print()} aria-label="인쇄">
            <Printer className="h-4 w-4 mr-1" aria-hidden="true" />인쇄
          </Button>
        )}
      </div>

      {okCount > 0 && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 rounded-md px-4 py-2 text-sm">
          <CheckCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          {okCount}건 등록 완료{errCount > 0 && ` · ${errCount}건 오류`}
        </div>
      )}

      <div className="space-y-3">
        {entries.map((entry, idx) => (
          <Card key={entry.id} className={
            entry.status === 'ok' ? 'border-green-300 bg-green-50' :
            entry.status === 'error' ? 'border-red-300 bg-red-50' : ''
          }>
            <CardHeader className="pb-2 pt-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  #{idx + 1}
                  {entry.status === 'ok' && <Badge variant="success" className="ml-2">등록 완료</Badge>}
                  {entry.status === 'error' && <Badge variant="destructive" className="ml-2">오류</Badge>}
                </CardTitle>
                <button
                  onClick={() => removeEntry(entry.id)}
                  disabled={entries.length === 1}
                  className="text-muted-foreground hover:text-destructive disabled:opacity-30 p-1"
                  aria-label={`${idx + 1}번 항목 삭제`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {entry.status === 'error' && (
                <p className="text-xs text-red-600 flex items-center gap-1 mt-1">
                  <AlertCircle className="h-3 w-3" aria-hidden="true" />{entry.errorMsg}
                </p>
              )}
            </CardHeader>
            <CardContent className="pb-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor={`provider-${entry.id}`} className="text-xs">제공자 전화번호 *</Label>
                  <Input
                    id={`provider-${entry.id}`}
                    placeholder="010-0000-0000"
                    value={entry.providerPhone}
                    onChange={e => updateEntry(entry.id, 'providerPhone', e.target.value)}
                    disabled={entry.status === 'ok'}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`receiver-${entry.id}`} className="text-xs">수요자 전화번호 *</Label>
                  <Input
                    id={`receiver-${entry.id}`}
                    placeholder="010-0000-0000"
                    value={entry.receiverPhone}
                    onChange={e => updateEntry(entry.id, 'receiverPhone', e.target.value)}
                    disabled={entry.status === 'ok'}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`cat-${entry.id}`} className="text-xs">서비스 유형 *</Label>
                  <select
                    id={`cat-${entry.id}`}
                    value={entry.category}
                    onChange={e => updateEntry(entry.id, 'category', e.target.value)}
                    disabled={entry.status === 'ok'}
                    className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                  >
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`date-${entry.id}`} className="text-xs">서비스 날짜 *</Label>
                  <Input
                    id={`date-${entry.id}`}
                    type="date"
                    value={entry.date}
                    onChange={e => updateEntry(entry.id, 'date', e.target.value)}
                    disabled={entry.status === 'ok'}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`dur-${entry.id}`} className="text-xs">시간(분) *</Label>
                  <Input
                    id={`dur-${entry.id}`}
                    type="number"
                    min={15} max={480} step={15}
                    value={entry.durationMinutes}
                    onChange={e => updateEntry(entry.id, 'durationMinutes', Number(e.target.value))}
                    disabled={entry.status === 'ok'}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`note-${entry.id}`} className="text-xs">비고</Label>
                  <Input
                    id={`note-${entry.id}`}
                    placeholder="메모 (선택)"
                    value={entry.note}
                    onChange={e => updateEntry(entry.id, 'note', e.target.value)}
                    disabled={entry.status === 'ok'}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <Button
          variant="outline"
          onClick={addEntry}
          disabled={entries.length >= 50}
          aria-label="항목 추가"
        >
          <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
          항목 추가 ({entries.length}/50)
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={submitting || entries.every(e => e.status === 'ok')}
          className="ml-auto"
          aria-label="일괄 등록"
        >
          {submitting
            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />등록 중…</>
            : `${entries.filter(e => e.status !== 'ok').length}건 일괄 등록`
          }
        </Button>
      </div>
    </div>
  )
}
