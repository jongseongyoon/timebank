'use client'

import { useEffect, useState } from 'react'
import { Loader2, Heart, RefreshCw, Stethoscope, Footprints, Users, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

interface FundData {
  updatedAt: string
  year: number
  totalMembers: number
  totalTransactions: number
  healthFund: {
    tpBalance: number; totalContributed: number; totalDistributed: number
  } | null
  circulationPool: {
    tpBalance: number; totalCirculated: number; totalDistributed: number
  } | null
  socialPrescriptionFund: {
    tpBalance: number; totalContributed: number
    distributedThisYear: number; annualLimit: number
  } | null
  walkReward: {
    tpPerGoal: number; distributedThisYear: number; annualTpLimit: number
  } | null
}

function StatCard({
  icon, label, value, sub, color = 'indigo',
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  color?: 'green' | 'blue' | 'purple' | 'indigo' | 'orange'
}) {
  const bg: Record<string, string> = {
    green:  'from-green-50 to-emerald-50 border-green-200',
    blue:   'from-blue-50 to-cyan-50 border-blue-200',
    purple: 'from-purple-50 to-violet-50 border-purple-200',
    indigo: 'from-indigo-50 to-blue-50 border-indigo-200',
    orange: 'from-orange-50 to-amber-50 border-orange-200',
  }
  const text: Record<string, string> = {
    green:  'text-green-700', blue:   'text-blue-700',
    purple: 'text-purple-700', indigo: 'text-indigo-700',
    orange: 'text-orange-700',
  }

  return (
    <div className={`bg-gradient-to-br ${bg[color]} border rounded-2xl p-5 space-y-2`}>
      <div className={`flex items-center gap-2 ${text[color]}`}>
        {icon}
        <p className="text-sm font-medium">{label}</p>
      </div>
      <p className={`text-2xl font-bold tabular-nums ${text[color]}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
    </div>
  )
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
          <StatCard
            icon={<Users className="h-4 w-4" />}
            label="가입 회원"
            value={`${data.totalMembers.toLocaleString()}명`}
            color="indigo"
          />
          <StatCard
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="완료 거래"
            value={`${data.totalTransactions.toLocaleString()}건`}
            color="blue"
          />
        </div>

        {/* 건강증진 기금 */}
        <div className="bg-white rounded-2xl p-5 border border-green-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <div className="bg-green-100 rounded-full p-2">
              <Heart className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">건강증진 기금</h2>
              <p className="text-xs text-gray-400">만보기 목표 달성 시 0.3 TP 지급 재원</p>
            </div>
          </div>
          {data.healthFund ? (
            <>
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
            </>
          ) : (
            <p className="text-sm text-gray-400">데이터 없음</p>
          )}
        </div>

        {/* 공동체 순환 풀 */}
        <div className="bg-white rounded-2xl p-5 border border-blue-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 rounded-full p-2">
              <RefreshCw className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">공동체 순환 풀</h2>
              <p className="text-xs text-gray-400">서비스 거래 10% 환류 · 만보기 0.2 TP 재원</p>
            </div>
          </div>
          {data.circulationPool ? (
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: '현재 잔액', value: data.circulationPool.tpBalance },
                { label: '총 환류', value: data.circulationPool.totalCirculated },
                { label: '총 재분배', value: data.circulationPool.totalDistributed },
              ].map(({ label, value }) => (
                <div key={label} className="bg-blue-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="font-bold text-blue-700 tabular-nums">{value.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">TP</p>
                </div>
              ))}
            </div>
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
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400">데이터 없음</p>
          )}
        </div>

        {/* 만보기 연간 발행 */}
        {data.walkReward && (
          <div className="bg-white rounded-2xl p-5 border border-orange-100 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <div className="bg-orange-100 rounded-full p-2">
                <Footprints className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-800">만보기 TP 발행 현황</h2>
                <p className="text-xs text-gray-400">{data.year}년 · 달성당 {data.walkReward.tpPerGoal} TP</p>
              </div>
            </div>
            <ProgressBar
              value={data.walkReward.distributedThisYear}
              max={data.walkReward.annualTpLimit}
              color="bg-orange-400"
            />
            <p className="text-xs text-gray-400 text-center">
              {data.year}년 한도: {data.walkReward.annualTpLimit.toLocaleString()} TP
            </p>
          </div>
        )}

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
