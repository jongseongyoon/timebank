import { Save } from 'lucide-react'
import { DONGS } from '@/lib/constants'
import { type MemberDetail, ROLE_LABELS, STATUS_LABELS, ALL_ROLES, ALL_STATUSES, fmtDate } from './types'

interface FormState { name: string; phone: string; dong: string; birthDate: string; roles: string[]; status: string }

interface Props {
  detail:    MemberDetail
  form:      FormState
  setForm:   React.Dispatch<React.SetStateAction<FormState>>
  saving:    boolean
  saveMsg:   string | null
  onSave:    () => void
}

export function InfoTab({ detail, form, setForm, saving, saveMsg, onSave }: Props) {
  return (
    <div className="p-5 space-y-4">
      <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50 rounded-xl p-3">
        <div><span className="text-gray-400">가입일</span><br /><span className="font-medium">{fmtDate(detail.createdAt)}</span></div>
        <div><span className="text-gray-400">출처</span><br /><span className="font-medium">{detail.syncSource === 'SHEET' ? '시트 가져오기' : '직접 가입'}</span></div>
        <div><span className="text-gray-400">평균 별점</span><br /><span className="font-medium">★ {Number(detail.avgRating).toFixed(1)} ({detail.ratingCount}건)</span></div>
        <div><span className="text-gray-400">마지막 동기화</span><br /><span className="font-medium">{detail.lastSyncedAt ? fmtDate(detail.lastSyncedAt) : '-'}</span></div>
      </div>

      {(['name', 'phone'] as const).map(field => (
        <label key={field} className="block">
          <span className="text-xs font-medium text-gray-600">{field === 'name' ? '이름' : '전화번호'}</span>
          <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} />
        </label>
      ))}

      <label className="block">
        <span className="text-xs font-medium text-gray-600">생년월일 (YYYY-MM-DD)</span>
        <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="예: 1945-03-15" value={form.birthDate} onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))} />
      </label>

      <label className="block">
        <span className="text-xs font-medium text-gray-600">동</span>
        <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={form.dong} onChange={e => setForm(f => ({ ...f, dong: e.target.value }))}>
          {DONGS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </label>

      <div>
        <span className="text-xs font-medium text-gray-600">역할</span>
        <div className="mt-2 flex gap-2 flex-wrap">
          {ALL_ROLES.map(r => (
            <label key={r} className="flex items-center gap-1.5 cursor-pointer select-none">
              <input type="checkbox" className="rounded" checked={form.roles.includes(r)}
                onChange={e => setForm(f => ({ ...f, roles: e.target.checked ? [...f.roles, r] : f.roles.filter(x => x !== r) }))} />
              <span className="text-sm">{ROLE_LABELS[r]}</span>
            </label>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="text-xs font-medium text-gray-600">상태</span>
        <select className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
      </label>

      <button onClick={onSave} disabled={saving}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-medium transition-colors">
        <Save className="h-4 w-4" />
        {saving ? '저장 중…' : '변경사항 저장'}
      </button>
      {saveMsg && <p className={`text-sm text-center ${saveMsg.startsWith('오류') ? 'text-red-500' : 'text-green-600'}`}>{saveMsg}</p>}
    </div>
  )
}
