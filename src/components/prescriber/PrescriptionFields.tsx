'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { REASONS, SERVICES } from './prescriber-constants'

export interface PrescriptionForm {
  prescriberOrg:  string
  prescriberRole: string
  careLevel:      number
  reasons:        string[]
  services:       string[]
  totalTpGranted: string
  monthlyTpLimit: string
  validFrom:      string
  validUntil:     string
  note:           string
}

export function emptyPrescription(): PrescriptionForm {
  return {
    prescriberOrg: '', prescriberRole: '', careLevel: 3,
    reasons: [], services: [],
    totalTpGranted: '50', monthlyTpLimit: '20',
    validFrom: '', validUntil: '', note: '',
  }
}

interface Props {
  value:    PrescriptionForm
  onChange: (f: PrescriptionForm) => void
}

export function PrescriptionFields({ value, onChange }: Props) {
  function upd<K extends keyof PrescriptionForm>(k: K, v: PrescriptionForm[K]) {
    onChange({ ...value, [k]: v })
  }
  function toggle(key: 'reasons' | 'services', v: string) {
    const arr = value[key]
    upd(key, arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v])
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">② 처방 내용</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 처방 기관 / 역할 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">처방 기관 *</Label>
            <Input value={value.prescriberOrg} onChange={e => upd('prescriberOrg', e.target.value)}
              placeholder="○○보건소 / ○○복지관" className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">처방자 직역 *</Label>
            <Input value={value.prescriberRole} onChange={e => upd('prescriberRole', e.target.value)}
              placeholder="의사 / 사회복지사" className="h-9 text-sm" />
          </div>
        </div>

        {/* 돌봄 등급 */}
        <div className="space-y-1">
          <Label className="text-xs">돌봄 등급 (1=자립 ~ 5=완전의존) *</Label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} type="button" onClick={() => upd('careLevel', n)}
                className={`flex-1 py-1.5 rounded-md text-sm font-medium border transition-colors
                  ${value.careLevel === n ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                {n}등급
              </button>
            ))}
          </div>
        </div>

        {/* 처방 사유 */}
        <div className="space-y-1">
          <Label className="text-xs">처방 사유 (복수 선택) *</Label>
          <div className="flex flex-wrap gap-1.5">
            {REASONS.map(r => (
              <button key={r.value} type="button" onClick={() => toggle('reasons', r.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors
                  ${value.reasons.includes(r.value) ? 'bg-orange-100 text-orange-700 border-orange-300' : 'bg-white text-gray-500 border-gray-200'}`}>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* 권장 서비스 */}
        <div className="space-y-1">
          <Label className="text-xs">권장 서비스 (복수 선택)</Label>
          <div className="flex flex-wrap gap-1.5">
            {SERVICES.map(s => (
              <button key={s.value} type="button" onClick={() => toggle('services', s.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors
                  ${value.services.includes(s.value) ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-white text-gray-500 border-gray-200'}`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* TP 배분 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">총 지급 TP *</Label>
            <Input type="number" min="0.5" step="0.5" value={value.totalTpGranted}
              onChange={e => upd('totalTpGranted', e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">월 사용 한도 TP *</Label>
            <Input type="number" min="0" step="0.5" value={value.monthlyTpLimit}
              onChange={e => upd('monthlyTpLimit', e.target.value)} className="h-9 text-sm" />
          </div>
        </div>

        {/* 유효기간 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">유효 시작일 *</Label>
            <Input type="date" value={value.validFrom}
              onChange={e => upd('validFrom', e.target.value)} className="h-9 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">유효 종료일 *</Label>
            <Input type="date" value={value.validUntil}
              onChange={e => upd('validUntil', e.target.value)} className="h-9 text-sm" />
          </div>
        </div>

        {/* 메모 */}
        <div className="space-y-1">
          <Label className="text-xs">메모 (선택)</Label>
          <textarea value={value.note} onChange={e => upd('note', e.target.value)}
            rows={2} placeholder="추가 소견·전달사항"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
        </div>
      </CardContent>
    </Card>
  )
}
