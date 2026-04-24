export const dynamic = 'force-dynamic'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatTC, formatDate, maskName } from '@/lib/utils'
import {
  Wallet, TrendingUp, TrendingDown, ClipboardList, PlusCircle,
  ArrowRight, CalendarDays, ChevronRight,
} from 'lucide-react'

const SERVICE_LABEL: Record<string, string> = {
  TRANSPORT: '이동지원', SHOPPING: '장보기', COMPANION: '말벗',
  MEAL: '식사지원', HOUSEKEEPING: '가사지원', MEDICAL_ESCORT: '의료동행',
  EDUCATION: '교육', DIGITAL_HELP: '디지털지원', REPAIR: '수리',
  CHILDCARE: '아이돌봄', LEGAL_CONSULT: '법률상담', HEALTH_CONSULT: '건강상담',
  ADMINISTRATIVE: '행정보조', COMMUNITY_EVENT: '공동체행사', OTHER: '기타',
}

const TX_STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  PENDING: 'warning', APPROVED: 'success', CANCELLED: 'outline', DISPUTED: 'destructive', RESOLVED: 'default',
}
const TX_STATUS_LABEL: Record<string, string> = {
  PENDING: '승인 대기', APPROVED: '완료', CANCELLED: '취소', DISPUTED: '분쟁', RESOLVED: '해결',
}

export default async function DashboardPage() {
  const session = await auth()
  const memberId = session!.user.id

  const [member, recentTxs, nearbyListings] = await Promise.all([
    prisma.member.findUnique({
      where: { id: memberId },
      select: { name: true, tcBalance: true, lifetimeEarned: true, lifetimeSpent: true, tcExpiresAt: true, dong: true },
    }),
    prisma.transaction.findMany({
      where: { OR: [{ providerId: memberId }, { receiverId: memberId }] },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        provider: { select: { name: true } },
        receiver: { select: { name: true } },
        serviceListing: { select: { category: true } },
      },
    }),
    prisma.serviceListing.findMany({
      where: { isActive: true, availableDong: { has: session!.user.dong } },
      take: 3,
      include: {
        provider: { select: { name: true } },
        organization: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  if (!member) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">안녕하세요, {member.name}님 👋</h1>
        <p className="text-muted-foreground text-sm mt-1">{member.dong} 타임뱅크</p>
      </div>

      {/* TC 지갑 카드 */}
      <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-blue-100 text-sm">현재 TC 잔액</p>
              <p className="text-5xl font-bold mt-1">{Number(member.tcBalance).toFixed(2)}</p>
              <p className="text-blue-200 text-sm mt-1">TC</p>
            </div>
            <Wallet className="h-10 w-10 text-blue-200 opacity-80" aria-hidden="true" />
          </div>
          <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-blue-400/40">
            <div>
              <p className="text-blue-200 text-xs">총 적립</p>
              <p className="text-white font-semibold">{formatTC(member.lifetimeEarned.toString())}</p>
            </div>
            <div>
              <p className="text-blue-200 text-xs">총 소진</p>
              <p className="text-white font-semibold">{formatTC(member.lifetimeSpent.toString())}</p>
            </div>
            <div>
              <p className="text-blue-200 text-xs">만료일</p>
              <p className="text-white font-semibold text-xs">
                {member.tcExpiresAt ? formatDate(member.tcExpiresAt) : '무기한'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 빠른 실행 */}
      <div className="grid grid-cols-2 gap-3">
        <Button asChild size="lg" className="h-14 text-base">
          <Link href="/services/request">
            <ClipboardList className="mr-2 h-5 w-5" aria-hidden="true" />
            서비스 요청하기
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="h-14 text-base">
          <Link href="/services/register">
            <PlusCircle className="mr-2 h-5 w-5" aria-hidden="true" />
            활동 등록하기
          </Link>
        </Button>
      </div>

      {/* 최근 거래 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">최근 거래</CardTitle>
          <Link href="/history" className="text-sm text-primary flex items-center hover:underline">
            전체보기 <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentTxs.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">거래 내역이 없습니다.</p>
          )}
          {recentTxs.map((tx) => {
            const isProvider = tx.providerId === memberId
            const counterpart = isProvider ? tx.receiver?.name : tx.provider?.name
            const tcChange = isProvider ? `+${Number(tx.tcAmount).toFixed(2)}` : `-${Number(tx.tcAmount).toFixed(2)}`
            const isPositive = isProvider

            return (
              <div key={tx.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isPositive ? 'bg-green-100' : 'bg-red-100'}`}>
                    {isPositive
                      ? <TrendingUp className="h-4 w-4 text-green-600" aria-hidden="true" />
                      : <TrendingDown className="h-4 w-4 text-red-600" aria-hidden="true" />
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {counterpart ? maskName(counterpart) : '시스템'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tx.serviceListing ? SERVICE_LABEL[tx.serviceListing.category] : '기타'} · {formatDate(tx.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-sm font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {tcChange} TC
                  </span>
                  <Badge variant={TX_STATUS_VARIANT[tx.status]} className="text-xs">
                    {TX_STATUS_LABEL[tx.status]}
                  </Badge>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* 주변 이용 가능 서비스 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">내 주변 서비스</CardTitle>
          <span className="text-xs text-muted-foreground">{member.dong}</span>
        </CardHeader>
        <CardContent className="space-y-3">
          {nearbyListings.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">등록된 서비스가 없습니다.</p>
          )}
          {nearbyListings.map((listing) => (
            <div key={listing.id} className="flex items-center justify-between py-2 border-b last:border-0">
              <div>
                <p className="text-sm font-medium">{listing.title}</p>
                <p className="text-xs text-muted-foreground">
                  {SERVICE_LABEL[listing.category]} · {listing.organization?.name ?? listing.provider?.name ?? '알 수 없음'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-primary">
                  {Number(listing.tcPerHour).toFixed(1)} TC/h
                </span>
                <Button asChild size="sm" variant="outline">
                  <Link href="/services/request" aria-label={`${listing.title} 요청하기`}>
                    요청 <ArrowRight className="ml-1 h-3 w-3" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
