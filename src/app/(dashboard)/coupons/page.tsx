'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Gift, Store } from 'lucide-react'
import Link from 'next/link'

interface CouponTx {
  id: string
  createdAt: string
  cashAmount: string | number
  itemDescription: string | null
  store: { storeName: string }
}

interface Coupon {
  id: string
  couponNo: string
  cashAmount: string | number
  cashRemaining: string | number
  validFrom: string
  validUntil: string
  prescriptionReason: string | null
  transactions: CouponTx[]
}

function fmtKRW(v: string | number) {
  return Number(v).toLocaleString('ko-KR') + '원'
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/coupons')
      .then(r => r.json())
      .then(d => setCoupons(d.coupons ?? []))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
  )

  if (coupons.length === 0) return (
    <div className="max-w-lg mx-auto text-center py-20 space-y-3">
      <Gift className="h-12 w-12 text-gray-200 mx-auto" />
      <p className="text-gray-400">현재 사용 가능한 착한쿠폰이 없습니다.</p>
    </div>
  )

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🎁 내 착한쿠폰</h1>
        <p className="text-sm text-muted-foreground mt-1">착한가게에서 사용할 수 있는 쿠폰입니다</p>
      </div>

      {coupons.map(c => {
        const total     = Number(c.cashAmount)
        const remaining = Number(c.cashRemaining)
        const used      = total - remaining
        const pct       = total > 0 ? Math.round(used / total * 100) : 0
        const isNearExpiry = new Date(c.validUntil).getTime() - Date.now() < 7 * 24 * 3600_000

        return (
          <Card key={c.id} className="overflow-hidden">
            {/* 잔액 카드 */}
            <div className="bg-gradient-to-r from-teal-600 to-teal-500 text-white p-5">
              <p className="text-teal-100 text-xs mb-1">잔액</p>
              <p className="text-4xl font-bold">{fmtKRW(remaining)}</p>
              <p className="text-teal-200 text-sm mt-1">(전체 {fmtKRW(total)} 중)</p>
              <div className="mt-3 h-1.5 bg-teal-700/40 rounded-full overflow-hidden">
                <div className="h-full bg-white/70 rounded-full" style={{ width: `${100 - pct}%` }} />
              </div>
              <p className={`text-xs mt-2 ${isNearExpiry ? 'text-yellow-200 font-semibold' : 'text-teal-200'}`}>
                {isNearExpiry && '⚠️ '} 사용기한: {fmtDate(c.validUntil)}까지
              </p>
            </div>

            <CardContent className="pt-4 space-y-4">
              <Button className="w-full gap-2 bg-teal-600 hover:bg-teal-700 text-white" asChild>
                <Link href="/scan">
                  <Store className="h-4 w-4" /> 착한가게에서 쓰기
                </Link>
              </Button>

              {/* 사용 내역 */}
              {c.transactions.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 font-medium mb-2">사용 내역</p>
                  <div className="space-y-2">
                    {c.transactions.map(tx => (
                      <div key={tx.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                        <div>
                          <p className="font-medium">{tx.store.storeName}</p>
                          <p className="text-xs text-gray-400">
                            {fmtDate(tx.createdAt)}
                            {tx.itemDescription && ` · ${tx.itemDescription}`}
                          </p>
                        </div>
                        <span className="font-semibold text-red-600">-{fmtKRW(tx.cashAmount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-300 text-center">쿠폰번호: {c.couponNo}</p>
            </CardContent>
          </Card>
        )
      })}

      {/* TP 노출 절대 금지 안내 (개발자용 주석) */}
      {/* 이 화면에는 TP 단위를 절대 표시하지 않음. 원화(원)만 표시. */}
    </div>
  )
}
