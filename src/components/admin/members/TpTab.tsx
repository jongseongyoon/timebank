import { type MemberDetail, fmtDate, fmtTP } from './types'

interface Props {
  detail:       MemberDetail
  tpAmount:     string
  tpDirection:  'add' | 'subtract'
  tpReason:     string
  tpSaving:     boolean
  tpMsg:        string | null
  setTpAmount:    (v: string) => void
  setTpDirection: (v: 'add' | 'subtract') => void
  setTpReason:    (v: string) => void
  onAdjust:     () => void
}

export function TpTab({ detail, tpAmount, tpDirection, tpReason, tpSaving, tpMsg, setTpAmount, setTpDirection, setTpReason, onAdjust }: Props) {
  return (
    <div className="p-5 space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '현재 잔액', value: fmtTP(detail.tpBalance),      color: 'text-blue-700' },
          { label: '총 획득',   value: fmtTP(detail.lifetimeEarned), color: 'text-green-700' },
          { label: '총 사용',   value: fmtTP(detail.lifetimeSpent),  color: 'text-gray-700' },
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

      <div className="space-y-3">
        <p className="text-sm font-semibold">TP 직접 조정</p>

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

        <input type="number" min="0.1" step="0.1"
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="조정 금액 (TP)" value={tpAmount} onChange={e => setTpAmount(e.target.value)} />

        <input className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="사유 (예: 사회적처방 지급)" value={tpReason} onChange={e => setTpReason(e.target.value)} />

        <button onClick={onAdjust} disabled={tpSaving || !tpAmount}
          className={`w-full py-2.5 rounded-xl text-sm font-medium text-white transition-colors disabled:opacity-50 ${tpDirection === 'add' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'}`}>
          {tpSaving ? '처리 중…' : tpDirection === 'add' ? 'TP 지급' : 'TP 차감'}
        </button>

        {tpMsg && <p className={`text-sm text-center ${tpMsg.startsWith('오류') ? 'text-red-500' : 'text-green-600'}`}>{tpMsg}</p>}
      </div>
    </div>
  )
}
