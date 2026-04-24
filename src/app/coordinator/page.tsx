export const dynamic = 'force-dynamic'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import {
  AlertTriangle, CheckCircle, Clock, Users,
  ChevronRight, ArrowRight,
} from 'lucide-react'
import { SupplyDemandChart } from '@/components/charts/supply-demand-chart'

const URGENCY_LABEL: Record<string, string> = { EMERGENCY: '응급', URGENT: '긴급', NORMAL: '일반' }
const SERVICE_LABEL: Record<string, string> = {
  TRANSPORT: '이동지원', SHOPPING: '장보기', COMPANION: '말벗',
  MEAL: '식사지원', HOUSEKEEPING: '가사지원', MEDICAL_ESCORT: '의료동행',
  EDUCATION: '교육', DIGITAL_HELP: '디지털지원', REPAIR: '수리',
  CHILDCARE: '아이돌봄', LEGAL_CONSULT: '법률상담', HEALTH_CONSULT: '건강상담',
  ADMINISTRATIVE: '행정보조', COMMUNITY_EVENT: '공동체행사', OTHER: '기타',
}

export default async function CoordinatorDashboard() {
  const session = await auth()
  const dong = session!.user.dong
  const coordId = session!.user.id

  const [
    pendingTxCount,
    emergencyRequests,
    recentApproved,
    memberCount,
    dongMembers,
    pendingTxStats,
  ] = await Promise.all([
    prisma.transaction.count({ where: { coordinatorId: coordId, status: 'PENDING' } }),
    prisma.serviceRequest.findMany({
      where: { urgency: 'EMERGENCY', status: 'OPEN', dong },
      include: { requester: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
      take: 5,
    }),
    prisma.transaction.findMany({
      where: { coordinatorId: coordId, status: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        provider: { select: { name: true } },
        receiver: { select: { name: true } },
        serviceListing: { select: { category: true } },
      },
    }),
    prisma.member.count({ where: { dong, status: 'ACTIVE' } }),
    prisma.member.findMany({
      where: { dong, status: 'ACTIVE' },
      select: { roles: true, tcBalance: true },
    }),
    prisma.transaction.groupBy({
      by: ['status'],
      where: { coordinatorId: coordId },
      _count: { id: true },
    }),
  ])

  // 수급 현황 계산
  const providerTC = dongMembers
    .filter((m) => m.roles.includes('PROVIDER'))
    .reduce((s, m) => s + Number(m.tcBalance), 0)
  const receiverTC = dongMembers
    .filter((m) => m.roles.includes('RECEIVER'))
    .reduce((s, m) => s + Number(m.tcBalance), 0)

  const supplyDemandData = [
    { name: '공급 TC', value: providerTC, fill: '#3b82f6' },
    { name: '수요 TC', value: receiverTC, fill: '#f59e0b' },
  ]

  const txStatusMap = Object.fromEntries(
    pendingTxStats.map((s) => [s.status, s._count.id])
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">코디네이터 대시보드</h1>
          <p className="text-muted-foreground text-sm mt-1">{dong} · {session!.user.name}</p>
        </div>
        <Button asChild size="sm">
          <Link href="/coordinator/matching">매칭 시작 <ArrowRight className="ml-1 h-4 w-4" /></Link>
        </Button>
      </div>

      {/* 상단 지표 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '승인 대기', value: pendingTxCount, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', href: '/coordinator/approval' },
          { label: '응급 요청', value: emergencyRequests.length, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', href: '/coordinator/matching' },
          { label: '담당 회원', value: memberCount, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', href: '/coordinator/members' },
          { label: '이번달 승인', value: txStatusMap['APPROVED'] ?? 0, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', href: '/coordinator/approval' },
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
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 좌하단: 긴급 요청 목록 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" aria-hidden="true" />
              긴급 요청
            </CardTitle>
            <Link href="/coordinator/matching" className="text-xs text-primary hover:underline flex items-center">
              전체보기 <ChevronRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {emergencyRequests.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">긴급 요청이 없습니다 ✓</p>
            )}
            {emergencyRequests.map((req) => (
              <Link key={req.id} href={`/coordinator/matching`}>
                <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 hover:bg-red-100 transition-colors border border-red-100">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{req.requester.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {SERVICE_LABEL[req.category]} · {formatDate(req.requestedDate)}
                    </p>
                  </div>
                  <Badge variant="destructive" className="shrink-0 ml-2">
                    {URGENCY_LABEL[req.urgency]}
                  </Badge>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* 우하단: 수급 현황 차트 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{dong} 수급 현황 (TC)</CardTitle>
          </CardHeader>
          <CardContent>
            <SupplyDemandChart data={supplyDemandData} />
          </CardContent>
        </Card>
      </div>

      {/* 최근 승인 내역 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">최근 승인 내역</CardTitle>
          <Link href="/coordinator/approval" className="text-xs text-primary hover:underline flex items-center">
            전체보기 <ChevronRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </CardHeader>
        <CardContent className="divide-y">
          {recentApproved.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">승인 내역이 없습니다.</p>
          )}
          {recentApproved.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {tx.provider?.name ?? '시스템'} → {tx.receiver?.name ?? '시스템'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {tx.serviceListing ? SERVICE_LABEL[tx.serviceListing.category] : '기타'} · {formatDate(tx.createdAt)}
                </p>
              </div>
              <span className="text-sm font-bold text-blue-600 shrink-0 ml-2">
                {Number(tx.tcAmount).toFixed(2)} TC
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
