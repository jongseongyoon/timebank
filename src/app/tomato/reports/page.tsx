export const dynamic = 'force-dynamic'
import { addDays } from 'date-fns'
import { prisma } from '@/lib/prisma'
import { Card, CardContent } from '@/components/ui/card'
import { Users, Coins, TrendingUp, TrendingDown } from 'lucide-react'

const ALERT_WINDOW_DAYS = 60

function num(v: unknown) {
  return Number(v ?? 0)
}

// 최근 6개월 라벨(YYYY-MM)
function lastMonths(n: number) {
  const out: string[] = []
  const d = new Date()
  d.setDate(1)
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1)
    out.push(`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`)
  }
  return out
}

type MonthAgg = { ym: string; earn: number; redeem: number; cnt: number; amt: number }
type CatAgg = { name: string; cnt: number; amt: number; points: number }

export default async function TomatoReportsPage() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const windowEnd = addDays(today, ALERT_WINDOW_DAYS)
  const months = lastMonths(6)

  const [memberCount, balanceAgg, ptRows, puRows, catRows, overdue, upcoming] = await Promise.all([
    prisma.tomatoMember.count(),
    prisma.tomatoMember.aggregate({ _sum: { pointsBalance: true } }),
    prisma.$queryRaw<{ ym: string; earn: number; redeem: number }[]>`
      SELECT to_char(date_trunc('month', "createdAt"), 'YYYY-MM') AS ym,
             COALESCE(SUM(CASE WHEN type = 'earn' THEN amount ELSE 0 END), 0)::int AS earn,
             COALESCE(SUM(CASE WHEN type = 'redeem' THEN -amount ELSE 0 END), 0)::int AS redeem
      FROM "TomatoPointTransaction"
      WHERE "createdAt" >= now() - interval '6 months'
      GROUP BY 1`,
    prisma.$queryRaw<{ ym: string; cnt: number; amt: number }[]>`
      SELECT to_char(date_trunc('month', "purchaseDate"), 'YYYY-MM') AS ym,
             COUNT(*)::int AS cnt,
             COALESCE(SUM("purchaseAmount"), 0)::bigint AS amt
      FROM "TomatoPurchase"
      WHERE "purchaseDate" >= now() - interval '6 months'
      GROUP BY 1`,
    prisma.$queryRaw<{ name: string; cnt: number; amt: number; points: number }[]>`
      SELECT c.name AS name,
             COUNT(p.id)::int AS cnt,
             COALESCE(SUM(p."purchaseAmount"), 0)::bigint AS amt,
             COALESCE(SUM(p."pointsEarned"), 0)::int AS points
      FROM "TomatoProductCategory" c
      LEFT JOIN "TomatoPurchase" p ON p."categoryId" = c.id
      GROUP BY c.name
      ORDER BY cnt DESC`,
    prisma.tomatoPurchase.count({ where: { managementDueDate: { not: null, lt: today } } }),
    prisma.tomatoPurchase.count({
      where: { managementDueDate: { gte: today, lte: windowEnd } },
    }),
  ])

  // 월별 병합
  const ptMap = new Map(ptRows.map((r) => [r.ym, r]))
  const puMap = new Map(puRows.map((r) => [r.ym, r]))
  const monthly: MonthAgg[] = months.map((ym) => ({
    ym,
    earn: num(ptMap.get(ym)?.earn),
    redeem: num(ptMap.get(ym)?.redeem),
    cnt: num(puMap.get(ym)?.cnt),
    amt: num(puMap.get(ym)?.amt),
  }))
  const cur = monthly[monthly.length - 1]
  const cats: CatAgg[] = catRows.map((r) => ({
    name: r.name,
    cnt: num(r.cnt),
    amt: num(r.amt),
    points: num(r.points),
  }))
  const totalBalance = num(balanceAgg._sum.pointsBalance)
  const maxAmt = Math.max(1, ...monthly.map((m) => m.amt))

  const cards = [
    { label: '총 회원', value: `${memberCount.toLocaleString()}명`, icon: Users, cls: 'text-slate-600' },
    { label: '총 포인트 잔액(부채)', value: `${totalBalance.toLocaleString()}P`, icon: Coins, cls: 'text-red-600' },
    { label: '이번달 적립', value: `+${cur.earn.toLocaleString()}P`, icon: TrendingUp, cls: 'text-green-600' },
    { label: '이번달 사용', value: `-${cur.redeem.toLocaleString()}P`, icon: TrendingDown, cls: 'text-orange-600' },
  ]

  return (
    <div className="max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">리포트 · 통계</h1>
        <p className="text-muted-foreground mt-1 text-sm">월별 포인트 적립/사용, 구매, 관리기한 현황 요약.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <c.icon className={'h-4 w-4 ' + c.cls} aria-hidden="true" /> {c.label}
              </div>
              <p className={'text-xl font-bold mt-1 ' + c.cls}>{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 월별 추이 */}
      <Card>
        <CardContent className="pt-5">
          <p className="font-semibold text-sm mb-3">월별 추이 (최근 6개월)</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b text-left text-muted-foreground text-xs">
                  <th className="py-2 pr-3">월</th>
                  <th className="py-2 pr-3 text-right">적립</th>
                  <th className="py-2 pr-3 text-right">사용</th>
                  <th className="py-2 pr-3 text-right">구매 건수</th>
                  <th className="py-2 pr-3 text-right">구매액</th>
                  <th className="py-2 pr-3 w-32">구매액 비중</th>
                </tr>
              </thead>
              <tbody>
                {monthly.map((m) => (
                  <tr key={m.ym} className="border-b">
                    <td className="py-2 pr-3 font-medium">{m.ym}</td>
                    <td className="py-2 pr-3 text-right text-green-700">+{m.earn.toLocaleString()}P</td>
                    <td className="py-2 pr-3 text-right text-orange-600">-{m.redeem.toLocaleString()}P</td>
                    <td className="py-2 pr-3 text-right">{m.cnt.toLocaleString()}건</td>
                    <td className="py-2 pr-3 text-right">{m.amt.toLocaleString()}원</td>
                    <td className="py-2 pr-3">
                      <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div className="bg-red-400 h-full rounded-full" style={{ width: `${(m.amt / maxAmt) * 100}%` }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 관리기한 + 카테고리 */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-5">
            <p className="font-semibold text-sm mb-3">관리기한 현황</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-red-700">초과</span>
                <span className="font-semibold">{overdue.toLocaleString()}건</span>
              </div>
              <div className="flex justify-between">
                <span className="text-orange-600">임박 (60일 이내)</span>
                <span className="font-semibold">{upcoming.toLocaleString()}건</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <p className="font-semibold text-sm mb-3">카테고리별 구매</p>
            {cats.length === 0 ? (
              <p className="text-sm text-muted-foreground">데이터 없음</p>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {cats.map((c) => (
                    <tr key={c.name} className="border-b last:border-0">
                      <td className="py-1.5">{c.name}</td>
                      <td className="py-1.5 text-right text-muted-foreground">{c.cnt}건</td>
                      <td className="py-1.5 text-right">{c.amt.toLocaleString()}원</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
