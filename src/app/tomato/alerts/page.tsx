export const dynamic = 'force-dynamic'
import { addDays } from 'date-fns'
import { prisma } from '@/lib/prisma'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertSms } from '@/components/tomato/alert-sms'
import { AlertTriangle, Clock } from 'lucide-react'

const ALERT_WINDOW_DAYS = 60 // 만료 60일 전부터 '임박'

function dayDiff(due: Date, today: Date) {
  return Math.round((due.getTime() - today.getTime()) / 86_400_000)
}

function fmt(d: Date) {
  return d.toISOString().slice(0, 10)
}

type Row = {
  id: string
  due: Date
  memberName: string
  phone: string | null
  categoryName: string
  productName: string | null
  purchaseDate: Date
}

function Table({ rows, today, overdue }: { rows: Row[]; today: Date; overdue: boolean }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">해당 없음</p>
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b text-left text-muted-foreground text-xs">
            <th className="py-2 pr-3">회원</th>
            <th className="py-2 pr-3">연락처</th>
            <th className="py-2 pr-3">제품</th>
            <th className="py-2 pr-3">구매일</th>
            <th className="py-2 pr-3">관리기한</th>
            <th className="py-2 pr-3 text-right">{overdue ? '경과' : '남은'}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const diff = dayDiff(r.due, today)
            return (
              <tr key={r.id} className={'border-b ' + (overdue ? 'bg-red-50/60' : '')}>
                <td className="py-2 pr-3 font-medium">{r.memberName}</td>
                <td className="py-2 pr-3">{r.phone || '-'}</td>
                <td className="py-2 pr-3">
                  {r.categoryName}
                  {r.productName && <span className="text-muted-foreground"> · {r.productName}</span>}
                </td>
                <td className="py-2 pr-3 text-muted-foreground text-xs">{fmt(r.purchaseDate)}</td>
                <td className="py-2 pr-3">{fmt(r.due)}</td>
                <td className="py-2 pr-3 text-right font-semibold">
                  {overdue ? (
                    <span className="text-red-700">{Math.abs(diff)}일 지남</span>
                  ) : (
                    <span className={diff <= 14 ? 'text-orange-600' : ''}>{diff}일 남음</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default async function TomatoAlertsPage() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const windowEnd = addDays(today, ALERT_WINDOW_DAYS)

  const items = await prisma.tomatoPurchase.findMany({
    where: { managementDueDate: { not: null, lte: windowEnd } },
    orderBy: { managementDueDate: 'asc' },
    include: {
      member: { select: { name: true, phone: true } },
      category: { select: { name: true } },
    },
    take: 500,
  })

  const rows: Row[] = items.map((i) => ({
    id: i.id,
    due: i.managementDueDate as Date,
    memberName: i.member.name,
    phone: i.member.phone,
    categoryName: i.category.name,
    productName: i.productName,
    purchaseDate: i.purchaseDate,
  }))

  const overdue = rows.filter((r) => r.due < today)
  const upcoming = rows.filter((r) => r.due >= today)

  return (
    <div className="max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">관리기한 알림</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          관리기한이 지났거나 {ALERT_WINDOW_DAYS}일 이내로 임박한 제품입니다. 재구매·점검 안내에 활용하세요.
        </p>
      </div>

      <div className="flex gap-3">
        <Badge variant="destructive">초과 {overdue.length}</Badge>
        <Badge variant="warning">임박 {upcoming.length}</Badge>
      </div>

      <Card>
        <CardContent className="pt-5">
          <p className="font-semibold text-sm mb-3 flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" /> 관리기한 초과
          </p>
          <Table rows={overdue} today={today} overdue />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <p className="font-semibold text-sm mb-3 flex items-center gap-2 text-orange-600">
            <Clock className="h-4 w-4" aria-hidden="true" /> 임박 (D-{ALERT_WINDOW_DAYS})
          </p>
          <Table rows={upcoming} today={today} overdue={false} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <AlertSms overdue={overdue.length} upcoming={upcoming.length} />
        </CardContent>
      </Card>
    </div>
  )
}
