export const dynamic = 'force-dynamic'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Gift, ScanLine, Store, ArrowRight } from 'lucide-react'

function fmtKRW(v: number) {
  return v.toLocaleString('ko-KR') + '원'
}
function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

export default async function CouponHome() {
  const session = await auth()
  const memberId = session!.user.id
  const now = new Date()

  const [coupons, store] = await Promise.all([
    prisma.goodCoupon.findMany({
      where: { receiverId: memberId, status: 'ACTIVE', validUntil: { gt: now }, cashRemaining: { gt: 0 } },
      orderBy: { validUntil: 'asc' },
      include: {
        transactions: {
          where: { status: 'APPROVED' },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { store: { select: { storeName: true } } },
        },
      },
    }),
    prisma.goodStore.findFirst({
      where: { memberId, status: { not: 'SUSPENDED' } },
      select: { id: true, storeName: true, cashBalance: true },
    }),
  ])

  const totalBalance = coupons.reduce((s, c) => s + Number(c.cashRemaining), 0)
  const nearest = coupons[0]
  const isNearExpiry = nearest && new Date(nearest.validUntil).getTime() - Date.now() < 7 * 24 * 3600_000

  return (
    <div className="space-y-5">
      {/* 가게주 카드 */}
      {store && (
        <Link href="/coupon/store"
          className="flex items-center gap-3 rounded-2xl bg-white border border-orange-200 px-4 py-3 hover:bg-orange-50 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center shrink-0">
            <Store className="h-5 w-5 text-white" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-orange-800 text-sm truncate">🏪 {store.storeName}</p>
            <p className="text-xs text-orange-600">결제 QR 보기 · 정산대기 {fmtKRW(Number(store.cashBalance))}</p>
          </div>
          <ArrowRight className="h-4 w-4 text-orange-600" aria-hidden="true" />
        </Link>
      )}

      {/* 잔액 카드 */}
      <div className="rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white p-6">
        <div className="flex items-center gap-2 text-orange-50 text-sm mb-1">
          <Gift className="h-4 w-4" aria-hidden="true" /> 사용 가능 쿠폰 잔액
        </div>
        <p className="text-4xl font-bold">{fmtKRW(totalBalance)}</p>
        <p className="text-orange-100 text-sm mt-1">
          {coupons.length > 0 ? `${coupons.length}장 보유` : '보유 쿠폰 없음'}
          {isNearExpiry && nearest && ` · ⚠️ ${fmtDate(nearest.validUntil)} 만료 임박`}
        </p>
      </div>

      {/* 착한가게 결제 버튼 */}
      {totalBalance > 0 && (
        <Link href="/coupon/scan"
          className="flex items-center justify-center gap-2 w-full h-16 rounded-2xl bg-orange-600 text-white text-lg font-bold hover:bg-orange-700 transition-colors shadow-sm">
          <ScanLine className="h-6 w-6" aria-hidden="true" />
          착한가게에서 결제하기
        </Link>
      )}

      {/* 보유 쿠폰 / 사용 내역 */}
      {coupons.length === 0 && !store ? (
        <div className="text-center py-12 space-y-3">
          <Gift className="h-12 w-12 text-orange-200 mx-auto" />
          <p className="text-gray-400 text-sm">현재 사용 가능한 착한쿠폰이 없습니다.</p>
        </div>
      ) : (
        coupons.map((c) => {
          const total = Number(c.cashAmount)
          const remaining = Number(c.cashRemaining)
          const usedPct = total > 0 ? Math.round(((total - remaining) / total) * 100) : 0
          return (
            <div key={c.id} className="rounded-2xl bg-white border border-orange-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-orange-50 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">쿠폰 잔액</p>
                  <p className="text-xl font-bold text-orange-700">{fmtKRW(remaining)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">전체 {fmtKRW(total)}</p>
                  <p className="text-xs text-gray-400">{fmtDate(c.validUntil)}까지</p>
                </div>
              </div>
              <div className="h-1.5 bg-orange-50">
                <div className="h-full bg-orange-400" style={{ width: `${100 - usedPct}%` }} />
              </div>
              {c.transactions.length > 0 && (
                <div className="px-4 py-3">
                  <p className="text-xs text-gray-400 font-medium mb-2">사용 내역</p>
                  <div className="space-y-1.5">
                    {c.transactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between text-sm py-1 border-b border-gray-50 last:border-0">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{tx.store.storeName}</p>
                          <p className="text-xs text-gray-400">
                            {fmtDate(tx.createdAt)}{tx.itemDescription && ` · ${tx.itemDescription}`}
                          </p>
                        </div>
                        <span className="font-semibold text-red-600 shrink-0 ml-2">-{fmtKRW(Number(tx.cashAmount))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
