export const dynamic = 'force-dynamic'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import {
  Users, Coins, Landmark, BarChart3,
  AlertTriangle, TrendingUp, ChevronRight, ArrowRight,
} from 'lucide-react'
import { TxTrendChart, DongMembersChart } from '@/components/charts/admin-charts'

export default async function AdminDashboard() {
  const session = await auth()

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const [
    activeMembers,
    totalMembers,
    tcAgg,
    fundAgg,
    monthlyTxCount,
    openRequests,
    coordinators,
    recentTxs,
    allMembers,
    weeklyTxs,
  ] = await Promise.all([
    prisma.member.count({ where: { status: 'ACTIVE' } }),
    prisma.member.count(),
    prisma.member.aggregate({ _sum: { tcBalance: true } }),
    prisma.fundTransaction.aggregate({ _sum: { tcEquivalent: true, cashAmount: true } }),
    prisma.transaction.count({ where: { createdAt: { gte: monthStart }, status: 'APPROVED' } }),
    prisma.serviceRequest.count({ where: { status: { in: ['OPEN', 'ESCALATED'] } } }),
    prisma.member.findMany({
      where: { roles: { has: 'COORDINATOR' }, status: 'ACTIVE' },
      select: {
        id: true, name: true, dong: true,
        _count: { select: { coordinatedTxs: true } },
      },
    }),
    prisma.transaction.findMany({
      where: { status: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: {
        provider: { select: { name: true } },
        receiver: { select: { name: true } },
      },
    }),
    prisma.member.findMany({
      where: { status: 'ACTIVE' },
      select: { dong: true, roles: true, tcBalance: true },
    }),
    prisma.transaction.findMany({
      where: { status: 'APPROVED', createdAt: { gte: weekAgo } },
      select: { createdAt: true },
    }),
  ])

  const totalTC = Number(tcAgg._sum.tcBalance ?? 0)
  const fundTC = Number(fundAgg._sum.tcEquivalent ?? 0)
  const fundCash = Number(fundAgg._sum.cashAmount ?? 0)
  const reserveRatio = totalTC > 0 ? Math.round((fundTC / totalTC) * 100) : 0

  // Aggregate weekly tx by day in JS (avoids groupBy DateTime issue)
  const dayMap: Record<string, number> = {}
  weeklyTxs.forEach((tx) => {
    const day = tx.createdAt.toISOString().slice(0, 10)
    dayMap[day] = (dayMap[day] ?? 0) + 1
  })
  const trendData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000)
    const key = d.toISOString().slice(0, 10)
    return { day: key.slice(5), count: dayMap[key] ?? 0 }
  })

  // Dong stats aggregated in JS
  const dongMap: Record<string, { members: number; tcBalance: number }> = {}
  allMembers.forEach((m) => {
    if (!dongMap[m.dong]) dongMap[m.dong] = { members: 0, tcBalance: 0 }
    dongMap[m.dong].members += 1
    dongMap[m.dong].tcBalance += Number(m.tcBalance)
  })
  const dongData = Object.entries(dongMap)
    .sort((a, b) => b[1].members - a[1].members)
    .slice(0, 6)
    .map(([dong, stats]) => ({ name: dong, members: stats.members }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">관리자 대시보드</h1>
          <p className="text-muted-foreground text-sm mt-1">{session!.user.name} · 시스템 전체 현황</p>
        </div>
        <Button asChild size="sm">
          <Link href="/admin/reports">보고서 보기 <ArrowRight className="ml-1 h-4 w-4" /></Link>
        </Button>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'TC 총 유통량', value: `${totalTC.toFixed(0)} TC`, icon: Coins, color: 'text-blue-600', bg: 'bg-blue-50', href: '/admin/reports' },
          { label: '활성 회원', value: `${activeMembers}명`, icon: Users, color: 'text-green-600', bg: 'bg-green-50', href: '/admin/reports' },
          { label: '지불준비율', value: `${reserveRatio}%`, icon: Landmark, color: reserveRatio >= 30 ? 'text-emerald-600' : 'text-red-600', bg: reserveRatio >= 30 ? 'bg-emerald-50' : 'bg-red-50', href: '/admin/fund' },
          { label: '이번달 승인 거래', value: `${monthlyTxCount}건`, icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50', href: '/admin/reports' },
          { label: '미처리 요청', value: `${openRequests}건`, icon: AlertTriangle, color: openRequests > 0 ? 'text-amber-600' : 'text-gray-500', bg: openRequests > 0 ? 'bg-amber-50' : 'bg-gray-50', href: '/coordinator/matching' },
          { label: '코디네이터', value: `${coordinators.length}명`, icon: BarChart3, color: 'text-purple-600', bg: 'bg-purple-50', href: '/admin/reports' },
        ].map(({ label, value, icon: Icon, color, bg, href }) => (
          <Link key={label} href={href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`h-5 w-5 ${color}`} aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className={`text-xl font-bold ${color}`}>{value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">최근 7일 승인 거래</CardTitle>
          </CardHeader>
          <CardContent>
            <TxTrendChart data={trendData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">동별 회원 현황</CardTitle>
          </CardHeader>
          <CardContent>
            <DongMembersChart data={dongData} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 코디네이터 현황 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">코디네이터 현황</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {coordinators.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">코디네이터가 없습니다.</p>
            )}
            {coordinators.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.dong}</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {c._count.coordinatedTxs}건 처리
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 최근 승인 내역 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">최근 승인 거래</CardTitle>
            <Link href="/admin/reports" className="text-xs text-primary hover:underline flex items-center">
              전체보기 <ChevronRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </CardHeader>
          <CardContent className="divide-y">
            {recentTxs.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">거래 내역이 없습니다.</p>
            )}
            {recentTxs.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-2.5">
                <div className="min-w-0">
                  <p className="text-sm truncate">
                    {tx.provider?.name ?? '시스템'} → {tx.receiver?.name ?? '시스템'}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(tx.createdAt)}</p>
                </div>
                <span className="text-sm font-bold text-blue-600 shrink-0 ml-2">
                  {Number(tx.tcAmount).toFixed(1)} TC
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* 기금 현황 요약 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Landmark className="h-4 w-4" aria-hidden="true" />
            지불준비금 기금 요약
          </CardTitle>
          <Link href="/admin/fund" className="text-xs text-primary hover:underline flex items-center">
            상세보기 <ChevronRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">TC 총 유통량</p>
              <p className="text-lg font-bold text-blue-600">{totalTC.toFixed(1)} TC</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">기금 보유 TC</p>
              <p className="text-lg font-bold text-indigo-600">{fundTC.toFixed(1)} TC</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">지불준비율</p>
              <p className={`text-lg font-bold ${reserveRatio >= 30 ? 'text-emerald-600' : 'text-red-600'}`}>
                {reserveRatio}%
                {reserveRatio < 30 && <span className="text-xs ml-1">(위험)</span>}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>0%</span>
              <span className="text-amber-600">위험선 30%</span>
              <span>100%</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${reserveRatio >= 30 ? 'bg-emerald-500' : 'bg-red-500'}`}
                style={{ width: `${Math.min(reserveRatio, 100)}%` }}
                role="progressbar"
                aria-valuenow={reserveRatio}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`지불준비율 ${reserveRatio}%`}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            현금 보유액: {fundCash.toLocaleString('ko-KR')}원
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
