import { Clock, RefreshCw, Footprints } from 'lucide-react'

interface Props {
  checking:  boolean
  rewarded:  boolean
  checkMsg:  { ok: boolean; text: string } | null
  onCheck:   () => void
}

export function WalkCheckCard({ checking, rewarded, checkMsg, onCheck }: Props) {
  return (
    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 space-y-3">
      <div className="flex items-start gap-2">
        <Clock className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-indigo-800">TP 자동 지급 안내</p>
          <p className="text-xs text-indigo-600 mt-1 leading-relaxed">
            매일 <strong>오후 11시 59분</strong>에 오늘 걸음수가 자동으로 확인되어
            1만보 달성 회원에게 <strong>0.5 TP</strong>가 지급됩니다.<br />
            지금 바로 확인하려면 아래 버튼을 누르세요.
          </p>
        </div>
      </div>
      {checkMsg && (
        <div className={`rounded-xl px-3 py-2 text-sm font-medium ${checkMsg.ok ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
          {checkMsg.text}
        </div>
      )}
      <button
        onClick={onCheck}
        disabled={checking || rewarded}
        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl py-3 text-sm font-semibold transition-colors"
      >
        {checking
          ? <><RefreshCw className="h-4 w-4 animate-spin" /> 확인 중...</>
          : rewarded
            ? <>✅ 오늘 이미 적립 완료</>
            : <><Footprints className="h-4 w-4" /> 지금 바로 걸음수 확인 및 TP 지급</>
        }
      </button>
    </div>
  )
}
