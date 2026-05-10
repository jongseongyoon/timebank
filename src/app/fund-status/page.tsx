'use client'

import { useEffect, useState } from 'react'
import { Loader2, Heart, Shield, Stethoscope, Footprints, Users, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import Link from 'next/link'

interface FundData {
  updatedAt: string
  year: number
  totalMembers: number
  totalTransactions: number
  healthFund: {
    tpBalance: number; totalContributed: number; totalDistributed: number
  } | null
  reserveFund: {
    tpBalance: number; totalCirculated: number
    reserveRatio: number; circulatingTP: number; targetRatio: number
    isHealthy: boolean; isWarning: boolean; isCritical: boolean
    privateMarketAvailable: boolean
  } | null
  socialPrescriptionFund: {
    tpBalance: number; totalContributed: number
    distributedThisYear: number; annualLimit: number
  } | null
  walkReward: {
    tpPerGoal: number; distributedThisYear: number; annualTpLimit: number
  } | null
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(value / max * 100, 100) : 0
  return (
    <div className="space-y-1">
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>{value.toLocaleString()} TP 사용</span>
        <span>{pct.toFixed(1)}%</span>
      </div>
    </div>
  )
}

function ReserveRatioBar({ ratio, targetRatio }: { ratio: number; targetRatio: number }) {
  // ratio, targetRatio 모두 0~1 소수 → %로 표시
  const pct       = Math.min(ratio * 100, 10)  // 10%를 최대 표시 너비로
  const targetPct = Math.min(targetRatio * 100, 10)
  const barWidth  = pct / 10 * 100  // 게이지 바 너비 %

  const barColor =
    ratio * 100 < 1 ? 'bg-red-500' :
    ratio * 100 < 3 ? 'bg-amber-400' :
    'bg-emerald-500'

  return (
    <div className="space-y-2">
      <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${barWidth}%` }} />
        {/* 목표선 */}
        <div
          className="absolute top-0 h-full w-0.5 bg-emerald-700 opacity-60"
          style={{ left: `${targetPct / 10 * 100}%` }}
        />
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-red-400">위험 1%</span>
        <span className="text-amber-500">주의 3%</span>
        <span className="text-emerald-600">목표 {(targetRatio * 100).toFixed(0)}%</span>
      </div>
    </div>
  )
}

export default function FundStatusPage() {
  const [data, setData] = useState<FundData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/fund-status')
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">데이터를 불러올 수 없습니다.</p>
      </div>
    )
  }

  const updatedTime = new Date(data.updatedAt).toLocaleString('ko-KR')
  const reserve = data.reserveFund

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* 헤더 */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-800">TimePay 기금 현황</h1>
            <p className="text-xs text-gray-400">광주서구 타임뱅크 재원 투명성 공개</p>
          </div>
          <Link href="/login" className="text-xs text-indigo-600 hover:underline">
            로그인 →
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* 요약 통계 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-indigo-700">
              <Users className="h-4 w-4" />
              <p className="text-sm font-medium">가입 회원</p>
            </div>
            <p className="text-2xl font-bold tabular-nums text-indigo-700">{data.totalMembers.toLocaleString()}명</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100 rounded-2xl p-5 space-y-2">
            <div className="flex items-center gap-2 text-blue-700">
              <CheckCircle2 className="h-4 w-4" />
              <p className="text-sm font-medium">완료 거래</p>
            </div>
            <p className="text-2xl font-bold tabular-nums text-blue-700">{data.totalTransactions.toLocaleString()}건</p>
          </div>
        </div>

        {/* 건강증진 기금 */}
        <div className="bg-white rounded-2xl p-5 border border-green-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <div className="bg-green-100 rounded-full p-2">
              <Heart className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">건강증진 기금</h2>
              <p className="text-xs text-gray-400">만보기 1만보 달성 시 0.5 TP 전액 지급 재원</p>
            </div>
          </div>
          {data.healthFund ? (
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: '현재 잔액', value: data.healthFund.tpBalance },
                { label: '총 투입', value: data.healthFund.totalContributed },
                { label: '총 지급', value: data.healthFund.totalDistributed },
              ].map(({ label, value }) => (
                <div key={label} className="bg-green-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="font-bold text-green-700 tabular-nums">{value.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">TP</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">데이터 없음</p>
          )}
          {data.walkReward && (
            <div className="space-y-1 pt-1 border-t border-green-50">
              <p className="text-xs text-gray-500">{data.year}년 만보기 발행 현황</p>
              <ProgressBar
                value={data.walkReward.distributedThisYear}
                max={data.walkReward.annualTpLimit}
                color="bg-green-400"
              />
              <p className="text-xs text-gray-400">
                연간 한도 {data.walkReward.annualTpLimit.toLocaleString()} TP · 달성당 {data.walkReward.tpPerGoal} TP
              </p>
            </div>
          )}
        </div>

        {/* 지불준비금 (순환 풀) */}
        <div className={`bg-white rounded-2xl p-5 shadow-sm space-y-4 border ${
          reserve?.isCritical ? 'border-red-200' :
          reserve?.isWarning  ? 'border-amber-200' :
          'border-blue-100'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`rounded-full p-2 ${
                reserve?.isCritical ? 'bg-red-100' :
                reserve?.isWarning  ? 'bg-amber-100' :
                'bg-blue-100'
              }`}>
                <Shield className={`h-4 w-4 ${
                  reserve?.isCritical ? 'text-red-600' :
                  reserve?.isWarning  ? 'text-amber-600' :
                  'text-blue-600'
                }`} />
              </div>
              <div>
                <h2 className="font-semibold text-gray-800">지불준비금</h2>
                <p className="text-xs text-gray-400">서비스 거래 5% 자동 환류 · TP 신뢰성 보장</p>
              </div>
            </div>
            {reserve && (
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                reserve.isCritical ? 'bg-red-100 text-red-700' :
                reserve.isWarning  ? 'bg-amber-100 text-amber-700' :
                'bg-emerald-100 text-emerald-700'
              }`}>
                {reserve.isCritical ? '⚠️ 위험' : reserve.isWarning ? '⚡ 주의' : '✅ 정상'}
              </span>
            )}
          </div>

          {reserve ? (
            <>
              {/* 지불준비율 게이지 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">지불준비율</p>
                  <p className={`text-lg font-bold tabular-nums ${
                    reserve.isCritical ? 'text-red-600' :
                    reserve.isWarning  ? 'text-amber-600' :
                    'text-emerald-600'
                  }`}>
                    {(reserve.reserveRatio * 100).toFixed(2)}%
                  </p>
                </div>
                <ReserveRatioBar ratio={reserve.reserveRatio} targetRatio={reserve.targetRatio} />
                <p className="text-xs text-gray-400">
                  준비금 {reserve.tpBalance.toLocaleString()} TP ·
                  유통 {reserve.circulatingTP.toLocaleString()} TP ·
                  목표 {(reserve.targetRatio * 100).toFixed(0)}%
                </p>
              </div>

              {/* 민간대행 가능 여부 */}
              <div className={`flex items-center gap-2 rounded-xl px-4 py-3 ${
                reserve.privateMarketAvailable
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-red-50 text-red-700'
              }`}>
                {reserve.privateMarketAvailable
                  ? <CheckCircle2 className="h-4 w-4 shrink-0" />
                  : <XCircle className="h-4 w-4 shrink-0" />
                }
                <p className="text-sm font-medium">
                  {reserve.privateMarketAvailable
                    ? '민간대행 결제 가능'
                    : '민간대행 결제 일시 중단 (준비율 1% 미만)'}
                </p>
              </div>

              {/* 경고 배너 */}
              {reserve.isCritical && (
                <div className="flex gap-2 items-start bg-red-50 border border-red-200 rounded-xl p-3">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-700">
                    지불준비율이 위험 수준(1%)에 도달했습니다.
                    관리자에게 지불준비금 충전을 요청하세요.
                  </p>
                </div>
              )}
              {!reserve.isCritical && reserve.isWarning && (
                <div className="flex gap-2 items-start bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-700">
                    지불준비율이 주의 구간(3%)입니다. 관리자가 모니터링 중입니다.
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-400">데이터 없음</p>
          )}
        </div>

        {/* 사회적처방 기금 */}
        <div className="bg-white rounded-2xl p-5 border border-purple-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <div className="bg-purple-100 rounded-full p-2">
              <Stethoscope className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">사회적처방 기금</h2>
              <p className="text-xs text-gray-400">취약 계층 TP 지원 전용 재원</p>
            </div>
          </div>
          {data.socialPrescriptionFund ? (
            <>
              <div className="grid grid-cols-2 gap-3 text-center">
                {[
                  { label: '현재 잔액', value: data.socialPrescriptionFund.tpBalance },
                  { label: '총 투입', value: data.socialPrescriptionFund.totalContributed },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-purple-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="font-bold text-purple-700 tabular-nums">{value.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">TP</p>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-500">{data.year}년 배분 현황</p>
                <ProgressBar
                  value={data.socialPrescriptionFund.distributedThisYear}
                  max={data.socialPrescriptionFund.annualLimit}
                  color="bg-purple-400"
                />
                <p className="text-xs text-gray-400">연간 한도 {data.socialPrescriptionFund.annualLimit.toLocaleString()} TP</p>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400">데이터 없음</p>
          )}
        </div>

        {/* 이것이 무엇인가요? */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <Footprints className="h-4 w-4 text-gray-500" />
            이것이 무엇인가요?
          </h2>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                <Heart className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-700">건강증진 기금</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  회원이 하루 1만 보를 달성하면 이 기금에서 0.5 TP가 자동 지급됩니다.
                  지자체 예산 또는 기업 CSR 기금으로 운영됩니다.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                <Shield className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-700">지불준비금</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  모든 서비스 거래 TP의 5%가 자동으로 쌓이는 준비금입니다.
                  TP의 실물 교환(민간대행 결제)을 보장하며, 준비율이 1% 미만이면 결제가 일시 중단됩니다.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center shrink-0">
                <Stethoscope className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-gray-700">사회적처방 기금</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  의료기관·복지기관 연계로 취약 계층 회원에게 TP를 무상 지원하는 재원입니다.
                  코디네이터가 처방서를 발행하고 관리자가 승인합니다.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="text-center space-y-2 pb-4">
          <p className="text-xs text-gray-400">마지막 갱신: {updatedTime}</p>
          <p className="text-xs text-gray-300">
            광주광역시 서구 타임뱅크 · 데이터는 실시간으로 갱신됩니다
          </p>
          <Link href="/" className="inline-block text-xs text-indigo-500 hover:underline">
            TimePay 홈으로
          </Link>
        </div>
      </div>
    </div>
  )
}
