export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// 스캔한 착한가게 정보 + 스캔한 회원의 사용 가능 쿠폰 잔액
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const store = await prisma.goodStore.findUnique({
    where: { id: params.id },
    select: { id: true, storeName: true, dong: true, category: true, status: true },
  })
  if (!store) return NextResponse.json({ error: '착한가게를 찾을 수 없습니다' }, { status: 404 })
  if (store.status === 'SUSPENDED') {
    return NextResponse.json({ error: '현재 이용할 수 없는 가게입니다' }, { status: 400 })
  }

  // 회원의 사용 가능 쿠폰 (만료 전, 잔액 보유)
  const now = new Date()
  const coupons = await prisma.goodCoupon.findMany({
    where: {
      receiverId: session.user.id,
      status: 'ACTIVE',
      validUntil: { gt: now },
      cashRemaining: { gt: 0 },
    },
    select: { id: true, cashRemaining: true, validUntil: true },
    orderBy: { validUntil: 'asc' },
  })

  const couponBalance = coupons.reduce((sum, c) => sum + Number(c.cashRemaining), 0)

  return NextResponse.json({
    store,
    couponBalance,
    couponCount: coupons.length,
    nearestExpiry: coupons[0]?.validUntil ?? null,
  })
}
