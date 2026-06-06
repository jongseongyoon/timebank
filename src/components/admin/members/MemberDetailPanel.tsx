import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { InfoTab }     from './InfoTab'
import { TpTab }       from './TpTab'
import { SecurityTab } from './SecurityTab'
import { type MemberDetail, fmtBirth, fmtTP } from './types'

interface Props {
  selectedId:       string
  onClose:          () => void
  onMemberUpdated:  () => void
}

type TabKey = 'info' | 'tp' | 'security'

export function MemberDetailPanel({ selectedId, onClose, onMemberUpdated }: Props) {
  const [detail,        setDetail]        = useState<MemberDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [tab,           setTab]           = useState<TabKey>('info')
  const [form,          setForm]          = useState({ name: '', phone: '', dong: '', birthDate: '', roles: [] as string[], status: '' })
  const [saving,        setSaving]        = useState(false)
  const [saveMsg,       setSaveMsg]       = useState<string | null>(null)
  const [tpAmount,      setTpAmount]      = useState('')
  const [tpDirection,   setTpDirection]   = useState<'add' | 'subtract'>('add')
  const [tpReason,      setTpReason]      = useState('')
  const [tpSaving,      setTpSaving]      = useState(false)
  const [tpMsg,         setTpMsg]         = useState<string | null>(null)
  const [resetLoading,  setResetLoading]  = useState(false)
  const [resetResult,   setResetResult]   = useState<string | null>(null)
  const [withdrawConfirm, setWithdrawConfirm] = useState(false)
  const [withdrawLoading, setWithdrawLoading] = useState(false)

  useEffect(() => {
    setDetailLoading(true); setDetail(null)
    setResetResult(null); setTpMsg(null); setSaveMsg(null); setTab('info')
    fetch(`/api/admin/members/${selectedId}`)
      .then(r => r.json())
      .then(d => {
        setDetail(d)
        setForm({ name: d.name, phone: d.phone, dong: d.dong, birthDate: fmtBirth(d.birthDate), roles: d.roles, status: d.status })
      })
      .finally(() => setDetailLoading(false))
  }, [selectedId])

  async function handleSave() {
    setSaving(true); setSaveMsg(null)
    try {
      const res  = await fetch(`/api/admin/members/${selectedId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, phone: form.phone, dong: form.dong, birthDate: form.birthDate, roles: form.roles, status: form.status }),
      })
      const data = await res.json()
      if (!res.ok) { setSaveMsg(`오류: ${data.error}`); return }
      setSaveMsg('저장됐습니다.')
      setDetail(prev => prev ? { ...prev, ...data } : prev)
      onMemberUpdated()
    } finally { setSaving(false) }
  }

  async function handleTpAdjust() {
    if (!tpAmount) return
    setTpSaving(true); setTpMsg(null)
    try {
      const res  = await fetch(`/api/admin/members/${selectedId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tpAdjust: { amount: parseFloat(tpAmount), direction: tpDirection, reason: tpReason } }),
      })
      const data = await res.json()
      if (!res.ok) { setTpMsg(`오류: ${data.error}`); return }
      setTpMsg(`완료. 현재 잔액: ${fmtTP(data.tpBalance)}`)
      setDetail(prev => prev ? { ...prev, tpBalance: data.tpBalance, lifetimeEarned: data.lifetimeEarned, lifetimeSpent: data.lifetimeSpent } : prev)
      onMemberUpdated(); setTpAmount(''); setTpReason('')
    } finally { setTpSaving(false) }
  }

  async function handleResetPw() {
    setResetLoading(true); setResetResult(null)
    try {
      const res  = await fetch(`/api/admin/members/${selectedId}/reset-password`, { method: 'POST' })
      const data = await res.json()
      setResetResult(res.ok ? '초기화 완료 — 생년월일 6자리(YYMMDD)가 임시 비밀번호입니다.' : `오류: ${data.error}`)
    } finally { setResetLoading(false) }
  }

  async function handleWithdraw() {
    setWithdrawLoading(true)
    try {
      const res = await fetch(`/api/admin/members/${selectedId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'WITHDRAWN' }),
      })
      if (res.ok) {
        setWithdrawConfirm(false)
        setDetail(prev => prev ? { ...prev, status: 'WITHDRAWN' } : prev)
        setForm(prev => ({ ...prev, status: 'WITHDRAWN' }))
        onMemberUpdated()
      }
    } finally { setWithdrawLoading(false) }
  }

  const TABS: [TabKey, string][] = [['info', '기본 정보'], ['tp', 'TP · 잔액'], ['security', '보안']]

  return (
    <div className="fixed right-0 top-0 h-full w-[480px] bg-white border-l shadow-2xl z-40 flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
        <div>
          <p className="font-semibold text-base">{detail?.name ?? '…'}</p>
          <p className="text-xs text-muted-foreground">{detail?.phone}</p>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X className="h-5 w-5 text-gray-500" /></button>
      </div>

      <div className="flex border-b shrink-0">
        {TABS.map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {detailLoading && <div className="flex items-center justify-center h-40 text-sm text-gray-400">로딩 중…</div>}
        {!detailLoading && detail && (
          <>
            {tab === 'info'     && <InfoTab     detail={detail} form={form} setForm={setForm} saving={saving} saveMsg={saveMsg} onSave={handleSave} />}
            {tab === 'tp'       && <TpTab       detail={detail} tpAmount={tpAmount} tpDirection={tpDirection} tpReason={tpReason} tpSaving={tpSaving} tpMsg={tpMsg} setTpAmount={setTpAmount} setTpDirection={setTpDirection} setTpReason={setTpReason} onAdjust={handleTpAdjust} />}
            {tab === 'security' && <SecurityTab detail={detail} formStatus={form.status} resetLoading={resetLoading} resetResult={resetResult} withdrawConfirm={withdrawConfirm} withdrawLoading={withdrawLoading} onResetPw={handleResetPw} setWithdrawConfirm={setWithdrawConfirm} onWithdraw={handleWithdraw} />}
          </>
        )}
      </div>
    </div>
  )
}
