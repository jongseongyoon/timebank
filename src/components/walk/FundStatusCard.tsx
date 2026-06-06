import { Heart } from 'lucide-react'

export interface FundStatus {
  healthFund:      { tpBalance: number; totalDistributed: number } | null
  circulationPool: { tpBalance: number; totalCirculated: number } | null
  walkConfig:      { annualTpLimit: number; distributedThisYear: number; tpPerGoal: number } | null
}

export function FundStatusCard({ status }: { status: FundStatus | null }) {
  if (!status?.healthFund) return null
  const { healthFund, walkConfig } = status
  const fundBal   = healthFund.tpBalance
  const yearDist  = walkConfig?.distributedThisYear ?? 0
  const yearLimit = walkConfig?.annualTpLimit ?? 0
  const yearPct   = yearLimit > 0 ? Math.min(yearDist / yearLimit * 100, 100) : 0

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <div className="bg-green-100 rounded-full p-2">
          <Heart className="h-4 w-4 text-green-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-green-800">오늘의 만보기 재원</p>
          <p className="text-xs text-green-600">건강증진 기금</p>
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-3xl font-bold text-green-800 tabular-nums">{fundBal.toLocaleString()} TP</p>
          <p className="text-xs text-green-600 mt-0.5">1만보 달성 시 <strong>0.5 TP</strong> 지급</p>
        </div>
        <div className="text-right text-xs text-green-500">
          <p>지자체·기업 출연 기금</p>
          <p>만보기 보상 전담</p>
        </div>
      </div>
      {walkConfig && (
        <div className="space-y-1 pt-1 border-t border-green-200">
          <div className="flex justify-between text-xs text-green-600">
            <span>올해 발행량</span>
            <span className="tabular-nums">{yearDist.toLocaleString()} / {yearLimit.toLocaleString()} TP</span>
          </div>
          <div className="h-2 bg-green-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${yearPct}%` }} />
          </div>
          <p className="text-xs text-green-400 text-right">{yearPct.toFixed(1)}% 사용</p>
        </div>
      )}
    </div>
  )
}
