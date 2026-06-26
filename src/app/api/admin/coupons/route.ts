export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { z } from 'zod'

// 100,000원 = 9.69 TP (스키마 기본값 기준 환산비)
const KRW_PER_TP = 100000 / 9.69

const schema = z.object({
  memberId: z.string().uuid(),
  cashAmount: z.number().positive().max(10000000),
  validDays: z.number().int().positive().max(1095).default(365),
  prescriptionReason: z.string().min(2).max(300),
})

function genCouponNo() {
  const d = new Date()
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase()
  return `GC-${ymd}-${rand}`
}

// 착한쿠폰 발급 (관리자 일방 배분)
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  if (!session.user.roles.includes('ADMIN')) return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 })

  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { memberId, cashAmount, validDays, prescriptionReason } = parsed.data

  const target = await prisma.member.findUnique({ where: { id: memberId }, select: { id: true, name: true } })
  if (!target) return NextResponse.json({ error: '회원 없음' }, { status: 404 })

  const internalTpValue = Math.round((cashAmount / KRW_PER_TP) * 100) / 100
  const validFrom = new Date()
  const validUntil = new Date(validFrom.getTime() + validDays * 24 * 60 * 60 * 1000)

  const coupon = await prisma.goodCoupon.create({
    data: {
      couponNo: genCouponNo(),
      receiverId: memberId,
      issuedBy: session.user.id,
      cashAmount,
      cashRemaining: cashAmount,
      internalTpValue,
      validFrom,
      validUntil,
      prescriptionReason,
      status: 'ACTIVE',
      fundSource: 'ADMIN',
    },
  })

  await prisma.auditLog.create({
    data: {
      adminId: session.user.id,
      action: 'GOOD_COUPON_ISSUE',
      targetId: memberId,
      details: JSON.stringify({
        couponNo: coupon.couponNo, memberId, targetName: target.name,
        cashAmount, internalTpValue, validUntil, prescriptionReason,
      }),
    },
  })

  return NextResponse.json({ ok: true, couponNo: coupon.couponNo })
}

// 발급 현황 조회
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  if (!session.user.roles.includes('ADMIN')) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const [agg, activeCount, recent] = await Promise.all([
    prisma.goodCoupon.aggregate({ _sum: { cashAmount: true, cashRemaining: true }, _count: true }),
    prisma.goodCoupon.count({ where: { status: 'ACTIVE' } }),
    prisma.goodCoupon.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { receiver: { select: { name: true, dong: true } } },
    }),
  ])

  return NextResponse.json({
    totalIssued: agg._count,
    totalCash: Number(agg._sum.cashAmount ?? 0),
    totalRemaining: Number(agg._sum.cashRemaining ?? 0),
    activeCount,
    recent: recent.map((c) => ({
      id: c.id,
      couponNo: c.couponNo,
      receiverName: c.receiver?.name ?? '-',
      receiverDong: c.receiver?.dong ?? '-',
      cashAmount: Number(c.cashAmount),
      cashRemaining: Number(c.cashRemaining),
      status: c.status,
      validUntil: c.validUntil,
      createdAt: c.createdAt,
      prescriptionReason: c.prescriptionReason,
    })),
  })
}
