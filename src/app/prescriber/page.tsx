'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle2, AlertTriangle, FilePlus2 } from 'lucide-react'
import { ReceiverPicker, type ReceiverMode, type ExistingMember } from '@/components/prescriber/ReceiverPicker'
import { PrescriptionFields, emptyPrescription, type PrescriptionForm } from '@/components/prescriber/PrescriptionFields'
import { emptyReceiver, type NewReceiverForm } from '@/components/prescriber/prescriber-constants'

interface IssueResult {
  prescriptionNo: string
  createdMember?: { name: string; phone: string }
  tempPassword?:  string
}

export default function PrescriberIssuePage() {
  const [mode, setMode]               = useState<ReceiverMode>('new')
  const [newReceiver, setNewReceiver] = useState<NewReceiverForm>(emptyReceiver())
  const [existing, setExisting]       = useState<ExistingMember | null>(null)
  const [rx, setRx]                   = useState<PrescriptionForm>(emptyPrescription())

  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast]   = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const [result, setResult] = useState<IssueResult | null>(null)

  function showToast(msg: string, type: 'ok' | 'err') {
    setToast({ msg, type }); setTimeout(() => setToast(null), 4000)
  }

  function reset() {
    setNewReceiver(emptyReceiver()); setExisting(null)
    setRx(emptyPrescription()); setMode('new'); setResult(null)
  }

  async function handleSubmit() {
    // 클라이언트 검증
    if (mode === 'new') {
      if (!newReceiver.name || !newReceiver.phone || !newReceiver.dong) {
        return showToast('신규 회원: 이름·전화번호·동은 필수입니다.', 'err')
      }
    } else if (!existing) {
      return showToast('기존 회원을 조회해 선택하세요.', 'err')
    }
    if (!rx.prescriberOrg || !rx.prescriberRole) return showToast('처방 기관·직역을 입력하세요.', 'err')
    if (rx.reasons.length === 0)                 return showToast('처방 사유를 1개 이상 선택하세요.', 'err')
    if (!rx.validFrom || !rx.validUntil)         return showToast('유효기간을 입력하세요.', 'err')
    if (new Date(rx.validUntil) <= new Date(rx.validFrom)) return showToast('종료일은 시작일보다 뒤여야 합니다.', 'err')
    if (Number(rx.totalTpGranted) <= 0)          return showToast('총 지급 TP는 0보다 커야 합니다.', 'err')

    setSubmitting(true)
    try {
      const payload: Record<string, any> = {
        prescriberOrg:       rx.prescriberOrg,
        prescriberRole:      rx.prescriberRole,
        careLevel:           rx.careLevel,
        prescriptionReason:  rx.reasons,
        recommendedServices: rx.services,
        totalTpGranted:      Number(rx.totalTpGranted),
        monthlyTpLimit:      Number(rx.monthlyTpLimit),
        validFrom:           rx.validFrom,
        validUntil:          rx.validUntil,
        note:                rx.note || undefined,
      }
      if (mode === 'new') {
        payload.newReceiver = {
          name: newReceiver.name, phone: newReceiver.phone,
          birthDate: newReceiver.birthDate || undefined,
          dong: newReceiver.dong, address: newReceiver.address || undefined,
          isVulnerable: newReceiver.isVulnerable, isDisabled: newReceiver.isDisabled,
        }
      } else {
        payload.receiverId = existing!.id
      }

      const res  = await fetch('/api/social-prescription', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) return showToast(data.error ?? '발급 실패', 'err')

      setResult({
        prescriptionNo: data.prescription.prescriptionNo,
        createdMember:  data.createdMember,
        tempPassword:   data.tempPassword,
      })
    } catch {
      showToast('네트워크 오류', 'err')
    } finally { setSubmitting(false) }
  }

  // ── 발급 완료 화면 ──────────────────────────────────────────────────────────
  if (result) {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center space-y-2">
          <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto" />
          <h2 className="text-lg font-bold text-green-800">처방전 발급 완료</h2>
          <p className="text-sm text-green-700">처방번호 <strong>{result.prescriptionNo}</strong></p>
          <p className="text-xs text-green-600">
            코디네이터 승인 후 대상자에게 TP가 지급됩니다 (현재 상태: 대기).
          </p>
        </div>

        {result.createdMember && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-1 text-sm">
            <p className="font-semibold text-blue-800">신규 회원 등록됨</p>
            <p className="text-blue-700">{result.createdMember.name} · {result.createdMember.phone}</p>
            <p className="text-blue-700">
              임시 비밀번호: <strong className="font-mono">{result.tempPassword}</strong>
            </p>
            <p className="text-xs text-blue-500 mt-1">
              ⚠️ 대상자에게 전달하고, 첫 로그인 후 비밀번호 변경을 안내하세요.
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={reset} className="flex-1 bg-teal-600 hover:bg-teal-700">
            <FilePlus2 className="h-4 w-4 mr-1" /> 새 처방 발급
          </Button>
        </div>
      </div>
    )
  }

  // ── 발급 폼 ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold">사회적처방 발급</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          대상자를 선택·등록하고 처방전을 발급합니다. 발급 후 코디네이터 승인을 거칩니다.
        </p>
      </div>

      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg text-white text-sm flex items-center gap-2
          ${toast.type === 'ok' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.type === 'ok' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      <ReceiverPicker
        mode={mode} setMode={setMode}
        newReceiver={newReceiver} setNewReceiver={setNewReceiver}
        existing={existing} setExisting={setExisting}
      />

      <PrescriptionFields value={rx} onChange={setRx} />

      <Button onClick={handleSubmit} disabled={submitting}
        className="w-full h-11 bg-teal-600 hover:bg-teal-700">
        {submitting
          ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> 발급 중…</>
          : <><FilePlus2 className="h-4 w-4 mr-2" /> 처방전 발급</>}
      </Button>
    </div>
  )
}
