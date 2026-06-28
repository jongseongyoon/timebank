export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { addDays } from 'date-fns'
import { prisma } from '@/lib/prisma'
import { Card, CardContent } from '@/components/ui/card'
import {
  Users, Coins, TrendingUp, TrendingDown, AlertTriangle, Clock,
  ShoppingCart, ScanLine, Upload, BellRing, Tags, BarChart3,
} from 'lucide-react'

const ALERT_WINDOW_DAYS = 60

export default async function TomatoDashboard() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const windowEnd = addDays(today, ALERT_WINDOW_DAYS)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

  const [memberCount, overdue, upcoming, earnAgg, redeemAgg] = await Promise.all([
    prisma.tomatoMember.count(),
    prisma.tomatoPurchase.count({ where: { managementDueDate: { not: null, lt: today } } }),
    prisma.tomatoPurchase.count({ where: { managementDueDate: { gte: today, lte: windowEnd } } }),
    prisma.tomatoPointTransaction.aggregate({
      _sum: { amount: true },
      where: { type: 'earn', createdAt: { gte: monthStart } },
    }),
    prisma.tomatoPointTransaction.aggregate({
      _sum: { amount: true },
      where: { type: 'redeem', createdAt: { gte: monthStart } },
    }),
  ])

  const earn = earnAgg._sum.amount ?? 0
  const redeem = Math.abs(redeemAgg._sum.amount ?? 0)

  const stats = [
    { label: '총 회원', value: `${memberCount.toLocaleString()}명`, icon: Users, cls: 'text-slate-600' },
    { label: '이번달 적립', value: `+${earn.toLocaleString()}P`, icon: TrendingUp, cls: 'text-green-600' },
    { label: '이번달 사용', value: `-${redeem.toLocaleString()}P`, icon: TrendingDown, cls: 'text-orange-600' },
    { label: '관리기한 초과', value: `${overdue.toLocaleString()}건`, icon: AlertTriangle, cls: 'text-red-600' },
    { label: '관리기한 임박', value: `${upcoming.toLocaleString()}건`, icon: Clock, cls: 'text-amber-600' },
  ]

  const actions = [
    { href: '/tomato/purchases/new', label: '구매 등록', desc: '구매 입력 · 2% 자동 적립', icon: ShoppingCart, primary: true },
    { href: '/tomato/scan', label: 'QR 스캔', desc: '회원 인식 · 적립/사용', icon: ScanLine, primary: true },
    { href: '/tomato/members', label: '회원 관리', desc: '검색 · 포인트 · 상세', icon: Users },
    { href: '/tomato/alerts', label: '관리기한 알림', desc: '초과/임박 · 안내 문자', icon: BellRing },
    { href: '/tomato/import', label: '엑셀 일괄등록', desc: '회원 한 번에 등록', icon: Upload },
    { href: '/tomato/categories', label: '제품 카테고리', desc: '관리연수 · 적립률', icon: Tags },
    { href: '/tomato/reports', label: '리포트·통계', desc: '월별 · 카테고리별', icon: BarChart3 },
  ]

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">토마토의료기</h1>
        <p className="text-muted-foreground mt-1 text-sm">회원·포인트·관리기한을 한 화면에서 관리합니다.</p>
      </div>

      {/* 현황 */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <s.icon className={'h-4 w-4 ' + s.cls} aria-hidden="true" /> {s.label}
              </div>
              <p className={'text-xl font-bold mt-1 ' + s.cls}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 관리기한 안내 배너 */}
      {(overdue > 0 || upcoming > 0) && (
        <Link href="/tomato/alerts">
          <Card className="border-red-200 bg-red-50/50 hover:bg-red-50 transition-colors">
            <CardContent className="pt-4 pb-4 flex items-center gap-3 text-sm">
              <BellRing className="h-5 w-5 text-red-600 shrink-0" aria-hidden="true" />
              <span>
                관리기한 <b className="text-red-700">초과 {overdue}건</b> · <b className="text-amber-700">임박 {upcoming}건</b>이
                있습니다. 클릭해 확인하고 안내 문자를 보낼 수 있어요.
              </span>
            </CardContent>
          </Card>
        </Link>
      )}

      {/* 바로가기 */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 mb-3">바로가기</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {actions.map((a) => (
            <Link key={a.href} href={a.href}>
              <Card className={'hover:shadow-md transition-shadow h-full ' + (a.primary ? 'border-red-300' : '')}>
                <CardContent className="pt-5 flex items-center gap-3">
                  <div
                    className={
                      'rounded-full p-2.5 shrink-0 ' +
                      (a.primary ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700')
                    }
                  >
                    <a.icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{a.label}</p>
                    <p className="text-xs text-muted-foreground">{a.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
