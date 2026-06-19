export const dynamic = 'force-dynamic'
import { unstable_cache } from 'next/cache'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatTP, formatDate, maskName } from '@/lib/utils'
import { kstToday } from '@/lib/kst'
import {
  Wallet, TrendingUp, TrendingDown, ClipboardList, PlusCircle,
  ArrowRight, ChevronRight, QrCode, ScanLine, Footprints,
  MessageSquare, Search, ArrowLeftRight, Stethoscope,
} from 'lucide-react'
import { WalkCard } from '@/components/layout/walk-card'

const SERVICE_LABEL: Record<string, string> = {
  TRANSPORT: '이동지원', SHOPPING: '장보기', COMPANION: '말벗',
  MEAL: '식사지원', HOUSEKEEPING: '가사지원', MEDICAL_ESCORT: '의료동행',
  EDUCATION: '교육', DIGITAL_HELP: '디지털지원', REPAIR: '수리',
  CHILDCARE: '몸활동지원', LEGAL_CONSULT: '법률상담', HEALTH_CONSULT: '건강상담',
  ADMINISTRATIVE: '행정보조', COMMUNITY_EVENT: '공동체행사', OTHER: '기타',
}

const TX_STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  PENDING: 'warning', APPROVED: 'success', CANCELLED: 'outline', DISPUTED: 'destructive', RESOLVED: 'default',
}
const TX_STATUS_LABEL: Record<string, string> = {
  PENDING: '승인 대기', APPROVED: '완료', CANCELLED: '취소', DISPUTED: '분쟁', RESOLVED: '해결',
}

// 주변 서비스 목록: 동(dong) 기준으로 캐시 (2분 TTL)
// 서비스 등록/변경 시 revalidateTag('listings') 호출로 즉시 무효화 가능
const getNearbyListings = unstable_cache(
  async (dong: string) =>
    prisma.serviceListing.findMany({
      where: { isActive: true, availableDong: { has: dong } },
      take: 3,
      include: {
        provider:     { select: { name: true } },
        organization: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ['nearby-listings'],
  { revalidate: 120, tags: ['listings'] },
)

export default async function DashboardPage() {
  const session = await auth()
  const memberId = session!.user.id

  const today = kstToday()

  // 사용자별 실시간 데이터와 캐시 가능한 목록 쿼리를 병렬로 실행
  const [member, recentTxs, nearbyListings, walkRecord] = await Promise.all([
    prisma.member.findUnique({
      where: { id: memberId },
      select: { name: true, tpBalance: true, lifetimeEarned: true, lifetimeSpent: true, tpExpiresAt: true, dong: true },
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
    getNearbyListings(session!.user.dong ?? ''),
    prisma.walkRecord.findUnique({
      where: { memberId_date: { memberId, date: today } },
    }),
  ])

  if (!member) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">안녕하세요, {member.name}님 👋</h1>
        <p className="text-muted-foreground text-sm mt-1">{member.dong} TimePay</p>
      </div>

      {/* 처방자 전용 바로가기 */}
      {session!.user.roles?.includes('PRESCRIBER') && (
        <Link href="/prescriber"
          className="flex items-center gap-3 rounded-2xl bg-teal-50 border border-teal-200 px-4 py-3 hover:bg-teal-100 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center shrink-0">
            <Stethoscope className="h-5 w-5 text-white" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-teal-800 text-sm">사회적처방 발급</p>
            <p className="text-xs text-teal-600">처방전 발급 · 회원 동시 등록</p>
          </div>
          <ArrowRight className="h-4 w-4 text-teal-600" aria-hidden="true" />
        </Link>
      )}

      {/* TP 지갑 카드 */}
      <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center justify-between gap-4">
            {/* 왼쪽: 잔액 */}
            <div className="flex items-center gap-3">
              <Wallet className="h-8 w-8 text-blue-200 opacity-70 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-blue-100 text-xs">현재 TP 잔액</p>
                <p className="text-4xl font-bold leading-tight">{Number(member.tpBalance).toFixed(2)}</p>
                <p className="text-blue-200 text-xs">TP (타임페이)</p>
              </div>
            </div>
            {/* 오른쪽: 통계 */}
            <div className="flex flex-col gap-1.5 text-right shrink-0">
              <div>
                <p className="text-blue-200 text-[10px]">총 적립</p>
                <p className="text-white font-semibold text-sm">{formatTP(member.lifetimeEarned.toString())}</p>
              </div>
              <div>
                <p className="text-blue-200 text-[10px]">총 소진</p>
                <p className="text-white font-semibold text-sm">{formatTP(member.lifetimeSpent.toString())}</p>
              </div>
              <div>
                <p className="text-blue-200 text-[10px]">만료일</p>
                <p className="text-white font-semibold text-xs">
                  {member.tpExpiresAt ? formatDate(member.tpExpiresAt) : '무기한'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 만보기 카드 — APK일 때 네이티브에서 실시간 읽기 */}
      <WalkCard
        serverSteps={walkRecord?.steps ?? 0}
        rewarded={walkRecord?.rewarded ?? false}
      />

      {/* ── 주요 기능 바로가기 ── */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">주요 기능</h2>
        <div className="grid grid-cols-4 gap-2">
          {[
            { href: '/wallet/qr',         icon: QrCode,         label: '내 QR',     bg: 'bg-blue-100',   color: 'text-blue-700' },
            { href: '/scan',              icon: ScanLine,       label: 'QR 스캔',   bg: 'bg-indigo-100', color: 'text-indigo-700' },
            { href: '/walk',              icon: Footprints,     label: '만보기',    bg: 'bg-green-100',  color: 'text-green-700' },
            { href: '/community',         icon: MessageSquare,  label: '커뮤니티',  bg: 'bg-purple-100', color: 'text-purple-700' },
            { href: '/services/browse',   icon: Search,         label: '서비스찾기', bg: 'bg-orange-100', color: 'text-orange-700' },
            { href: '/services/request',  icon: ClipboardList,  label: '서비스요청', bg: 'bg-red-100',    color: 'text-red-700' },
            { href: '/services/register', icon: PlusCircle,     label: '서비스등록', bg: 'bg-teal-100',   color: 'text-teal-700' },
            { href: '/history',           icon: ArrowLeftRight, label: '거래내역',  bg: 'bg-gray-100',   color: 'text-gray-700' },
          ].map(({ href, icon: Icon, label, bg, color }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-white border border-gray-100 hover:shadow-sm active:scale-95 transition-all"
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} aria-hidden="true" />
              </div>
              <span className="text-[11px] font-medium text-gray-700 text-center leading-tight">{label}</span>
            </Link>
          ))}
        </div>
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
            const tcChange = isProvider ? `+${Number(tx.tpAmount).toFixed(2)}` : `-${Number(tx.tpAmount).toFixed(2)}`
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
                    {tcChange} TP
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
                  {Number(listing.tpPerHour).toFixed(1)} TP/h
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
