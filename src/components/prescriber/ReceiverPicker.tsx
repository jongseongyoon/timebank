'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { UserPlus, UserCheck, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { DONGS, type NewReceiverForm } from './prescriber-constants'

export type ReceiverMode = 'new' | 'existing'
export interface ExistingMember { id: string; name: string; dong: string }

interface Props {
  mode:           ReceiverMode
  setMode:        (m: ReceiverMode) => void
  newReceiver:    NewReceiverForm
  setNewReceiver: (f: NewReceiverForm) => void
  existing:       ExistingMember | null
  setExisting:    (m: ExistingMember | null) => void
}

export function ReceiverPicker({ mode, setMode, newReceiver, setNewReceiver, existing, setExisting }: Props) {
  const [phone, setPhone]   = useState('')
  const [busy, setBusy]     = useState(false)
  const [lookupMsg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  function upd<K extends keyof NewReceiverForm>(k: K, v: NewReceiverForm[K]) {
    setNewReceiver({ ...newReceiver, [k]: v })
  }

  async function lookup() {
    setBusy(true); setMsg(null); setExisting(null)
    try {
      const res = await fetch(`/api/social-prescription/lookup-receiver?phone=${encodeURIComponent(phone)}`)
      const d   = await res.json()
      if (!res.ok)      { setMsg({ ok: false, text: d.error ?? '조회 실패' }); return }
      if (!d.found)     { setMsg({ ok: false, text: d.error ?? '등록되지 않은 전화번호입니다.' }); return }
      setExisting(d.member)
      setMsg({ ok: true, text: `${d.member.name} (${d.member.dong}) 확인됨` })
    } catch {
      setMsg({ ok: false, text: '네트워크 오류' })
    } finally { setBusy(false) }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">① 처방 대상자</CardTitle>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mt-2">
          <button type="button" onClick={() => setMode('new')}
            className={`flex-1 text-sm py-1.5 rounded-md font-medium flex items-center justify-center gap-1 transition-colors
              ${mode === 'new' ? 'bg-white shadow text-teal-700' : 'text-gray-500'}`}>
            <UserPlus className="h-4 w-4" /> 신규 회원 등록
          </button>
          <button type="button" onClick={() => setMode('existing')}
            className={`flex-1 text-sm py-1.5 rounded-md font-medium flex items-center justify-center gap-1 transition-colors
              ${mode === 'existing' ? 'bg-white shadow text-teal-700' : 'text-gray-500'}`}>
            <UserCheck className="h-4 w-4" /> 기존 회원
          </button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {mode === 'new' ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">이름 *</Label>
              <Input value={newReceiver.name} onChange={e => upd('name', e.target.value)}
                placeholder="홍길동" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">전화번호 *</Label>
              <Input value={newReceiver.phone} onChange={e => upd('phone', e.target.value)}
                placeholder="010-0000-0000" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">생년월일 (8자리)</Label>
              <Input value={newReceiver.birthDate} onChange={e => upd('birthDate', e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="19450301" inputMode="numeric" className="h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">동 *</Label>
              <select value={newReceiver.dong} onChange={e => upd('dong', e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option value="">선택</option>
                {DONGS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">주소 (선택)</Label>
              <Input value={newReceiver.address} onChange={e => upd('address', e.target.value)}
                placeholder="상세 주소" className="h-9 text-sm" />
            </div>
            <div className="col-span-2 flex gap-4 pt-1">
              <label className="flex items-center gap-1.5 text-sm text-gray-600">
                <input type="checkbox" checked={newReceiver.isVulnerable}
                  onChange={e => upd('isVulnerable', e.target.checked)} /> 취약계층
              </label>
              <label className="flex items-center gap-1.5 text-sm text-gray-600">
                <input type="checkbox" checked={newReceiver.isDisabled}
                  onChange={e => upd('isDisabled', e.target.checked)} /> 장애인
              </label>
            </div>
            <p className="col-span-2 text-xs text-gray-400 bg-gray-50 rounded-md p-2">
              💡 임시 비밀번호는 <strong>생년월일 6자리(YYMMDD)</strong>로 자동 설정됩니다.
              생년월일 미입력 시 전화번호 뒤 8자리가 사용됩니다.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <Label className="text-xs">대상자 전화번호로 조회</Label>
            <div className="flex gap-2">
              <Input value={phone} onChange={e => { setPhone(e.target.value); setExisting(null); setMsg(null) }}
                placeholder="010-0000-0000" className="h-9 text-sm" />
              <Button type="button" onClick={lookup} disabled={busy || !phone} className="h-9 shrink-0">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : '조회'}
              </Button>
            </div>
            {lookupMsg && (
              <p className={`text-sm flex items-center gap-1 ${lookupMsg.ok ? 'text-green-600' : 'text-red-600'}`}>
                {lookupMsg.ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {lookupMsg.text}
              </p>
            )}
            {existing && (
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-sm">
                <p className="font-semibold text-teal-800">{existing.name}</p>
                <p className="text-xs text-teal-600">{existing.dong} · 이 회원에게 처방합니다</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
