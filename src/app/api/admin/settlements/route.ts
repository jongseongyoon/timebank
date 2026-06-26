export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

function monthRange(month: string) {
  // month = "YYYY-MM"
  const [y, m] = month.split('-').map(Number)
  const start = new Date(y, m - 1, 1)
  const end = new Date(y, m, 1)
  return { start, end }
}

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) return { error: NextResponse.json({ error: '인증 필요' }, { status: 401 }) }
  if (!session.user.roles.includes('ADMIN')) return { error: NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 }) }
  return { session }
}

// 정산 현황 조회: ?month=YYYY-MM
export async function GET(req: NextRequest) {
  const { error, session } = await requireAdmin()
  if (error) return error

  const month = req.nextUrl.searchParams.get('month') ?? new Date().toISOString().slice(0, 7)
  const { start, end } = monthRange(month)

  const [settlements, unsettledAgg, pendingStores] = await Promise.all([
    // 해당 월 정산 내역
    prisma.goodCouponSettlement.findMany({
      where: { settlementMonth: month },
      orderBy: { createdAt: 'desc' },
      include: {
        store: { select: { storeName: true, dong: true, bankName: true, accountNo: true, accountHolder: true } },
        processor: { select: { name: true } },
      },
    }),
    // 해당 월 아직 정산 안 된 거래 합계
    prisma.goodCouponTransaction.aggregate({
      where: { status: 'APPROVED', settlementId: null, createdAt: { gte: start, lt: end } },
      _sum: { cashAmount: true },
      _count: true,
    }),
    // 정산 대기 잔액 보유 가게 수
    prisma.goodStore.count({ where: { cashBalance: { gt: 0 } } }),
  ])

  return NextResponse.json({
    month,
    settlements: settlements.map((s) => ({
      id: s.id,
      storeName: s.store.storeName,
      dong: s.store.dong,
      bankName: s.store.bankName,
      accountNo: s.store.accountNo,
      accountHolder: s.store.accountHolder,
      totalCashAmount: Number(s.totalCashAmount),
      transactionCount: s.transactionCount,
      status: s.bankTransferStatus,
      bankTransferDate: s.bankTransferDate,
      bankTransferNote: s.bankTransferNote,
      processorName: s.processor?.name,
      createdAt: s.createdAt,
    })),
    unsettledAmount: Number(unsettledAgg._sum.cashAmount ?? 0),
    unsettledTxCount: unsettledAgg._count,
    pendingStoreCount: pendingStores,
  })
}

// 정산 생성: 해당 월 미정산 거래를 가게별로 묶어 정산 레코드 생성
const genSchema = z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) })

export async function POST(req: NextRequest) {
  const { error, session } = await requireAdmin()
  if (error) return error

  const parsed = genSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: '월 형식 오류 (YYYY-MM)' }, { status: 400 })
  const { month } = parsed.data
  const { start, end } = monthRange(month)

  const txns = await prisma.goodCouponTransaction.findMany({
    where: { status: 'APPROVED', settlementId: null, createdAt: { gte: start, lt: end } },
    select: { id: true, storeId: true, cashAmount: true },
  })

  if (txns.length === 0) {
    return NextResponse.json({ ok: true, created: 0, merged: 0, skipped: 0, message: '정산할 거래가 없습니다.' })
  }

  // 가게별 집계
  const byStore = new Map<string, { sum: number; ids: string[] }>()
  for (const t of txns) {
    const e = byStore.get(t.storeId) ?? { sum: 0, ids: [] }
    e.sum += Number(t.cashAmount)
    e.ids.push(t.id)
    byStore.set(t.storeId, e)
  }

  let created = 0, merged = 0, skipped = 0

  for (const [storeId, { sum, ids }] of byStore) {
    const existing = await prisma.goodCouponSettlement.findUnique({
      where: { settlementMonth_storeId: { settlementMonth: month, storeId } },
    })

    if (existing) {
      if (existing.bankTransferStatus !== 'PENDING') {
        // 이미 이체 완료/실패 처리된 달 → 병합 불가, 건너뜀
        skipped += ids.length
        continue
      }
      await prisma.$transaction([
        prisma.goodCouponSettlement.update({
          where: { id: existing.id },
          data: {
            totalCashAmount: { increment: sum },
            transactionCount: { increment: ids.length },
          },
        }),
        prisma.goodCouponTransaction.updateMany({
          where: { id: { in: ids } },
          data: { settlementId: existing.id },
        }),
      ])
      merged += ids.length
    } else {
      const settlement = await prisma.goodCouponSettlement.create({
        data: {
          settlementMonth: month,
          storeId,
          totalCashAmount: sum,
          transactionCount: ids.length,
          processedBy: session!.user.id,
          bankTransferStatus: 'PENDING',
        },
      })
      await prisma.goodCouponTransaction.updateMany({
        where: { id: { in: ids } },
        data: { settlementId: settlement.id },
      })
      created += 1
    }
  }

  return NextResponse.json({ ok: true, created, mergedTx: merged, skipped, stores: byStore.size })
}

// 이체 완료/실패 처리
const patchSchema = z.object({
  settlementId: z.string().uuid(),
  status: z.enum(['TRANSFERRED', 'FAILED', 'PENDING']),
  note: z.string().max(300).optional(),
})

export async function PATCH(req: NextRequest) {
  const { error, session } = await requireAdmin()
  if (error) return error

  const parsed = patchSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: '입력값 오류' }, { status: 400 })
  const { settlementId, status, note } = parsed.data

  const settlement = await prisma.goodCouponSettlement.findUnique({ where: { id: settlementId } })
  if (!settlement) return NextResponse.json({ error: '정산 내역 없음' }, { status: 404 })

  const wasTransferred = settlement.bankTransferStatus === 'TRANSFERRED'
  const willTransfer = status === 'TRANSFERRED'

  const ops: any[] = [
    prisma.goodCouponSettlement.update({
      where: { id: settlementId },
      data: {
        bankTransferStatus: status,
        bankTransferDate: willTransfer ? new Date() : null,
        bankTransferNote: note ?? null,
      },
    }),
  ]

  // 이체 완료로 전환 시 가게 잔액 정산 반영 (중복 방지)
  if (willTransfer && !wasTransferred) {
    ops.push(
      prisma.goodStore.update({
        where: { id: settlement.storeId },
        data: {
          cashBalance: { decrement: settlement.totalCashAmount },
          totalSettled: { increment: settlement.totalCashAmount },
        },
      }),
    )
  } else if (!willTransfer && wasTransferred) {
    // 이체 완료 → 취소(되돌림)
    ops.push(
      prisma.goodStore.update({
        where: { id: settlement.storeId },
        data: {
          cashBalance: { increment: settlement.totalCashAmount },
          totalSettled: { decrement: settlement.totalCashAmount },
        },
      }),
    )
  }

  ops.push(
    prisma.auditLog.create({
      data: {
        adminId: session!.user.id,
        action: 'GOOD_COUPON_SETTLE',
        targetId: settlement.storeId,
        details: JSON.stringify({ settlementId, status, amount: Number(settlement.totalCashAmount), note }),
      },
    }),
  )

  await prisma.$transaction(ops)
  return NextResponse.json({ ok: true })
}
