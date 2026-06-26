export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  storeId: z.string().uuid(),
  cashAmount: z.number().int().positive().max(10000000),
  itemDescription: z.string().max(200).optional(),
})

// 착한쿠폰으로 착한가게 결제 (회원이 가게 QR을 스캔한 뒤 호출)
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: '입력값 오류' }, { status: 400 })
  const { storeId, cashAmount, itemDescription } = parsed.data
  const memberId = session.user.id

  const store = await prisma.goodStore.findUnique({
    where: { id: storeId },
    select: { id: true, storeName: true, status: true },
  })
  if (!store) return NextResponse.json({ error: '착한가게를 찾을 수 없습니다' }, { status: 404 })
  if (store.status === 'SUSPENDED') return NextResponse.json({ error: '이용할 수 없는 가게입니다' }, { status: 400 })

  const now = new Date()
  const coupons = await prisma.goodCoupon.findMany({
    where: { receiverId: memberId, status: 'ACTIVE', validUntil: { gt: now }, cashRemaining: { gt: 0 } },
    orderBy: { validUntil: 'asc' }, // 만료 임박 쿠폰부터 사용
  })

  const totalRemaining = coupons.reduce((s, c) => s + Number(c.cashRemaining), 0)
  if (totalRemaining < cashAmount) {
    return NextResponse.json(
      { error: `쿠폰 잔액이 부족합니다 (보유 ${totalRemaining.toLocaleString('ko-KR')}원 / 결제 ${cashAmount.toLocaleString('ko-KR')}원)` },
      { status: 400 },
    )
  }

  // 만료 임박 쿠폰부터 순차 차감 (여러 쿠폰에 걸쳐 결제 가능)
  const ops: any[] = []
  let remaining = cashAmount
  for (const c of coupons) {
    if (remaining <= 0) break
    const avail = Number(c.cashRemaining)
    const take = Math.min(avail, remaining)
    ops.push(
      prisma.goodCoupon.update({
        where: { id: c.id },
        data: { cashRemaining: { decrement: take } },
      }),
    )
    ops.push(
      prisma.goodCouponTransaction.create({
        data: {
          couponId: c.id,
          receiverId: memberId,
          storeId,
          cashAmount: take,
          itemDescription: itemDescription ?? null,
          storeApproved: true,
          storeApprovedAt: now,
          status: 'APPROVED',
        },
      }),
    )
    remaining -= take
  }

  // 가게 잔액(정산 대상) 증가
  ops.push(
    prisma.goodStore.update({
      where: { id: storeId },
      data: {
        cashBalance: { increment: cashAmount },
        totalReceived: { increment: cashAmount },
      },
    }),
  )

  await prisma.$transaction(ops)

  return NextResponse.json({
    ok: true,
    storeName: store.storeName,
    paidAmount: cashAmount,
    remainingBalance: totalRemaining - cashAmount,
  })
}
