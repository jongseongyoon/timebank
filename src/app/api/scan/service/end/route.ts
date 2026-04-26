export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  transactionId: z.string().uuid(),
})

const MIN_BALANCE = -3.0  // 수혜자 최저 잔액 한도

// QR로 서비스 종료 → 시간 계산 → TP 이전 → APPROVED
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { transactionId } = parsed.data

  const tx = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: {
      provider: { select: { id: true, tcBalance: true } },
      receiver: { select: { id: true, tcBalance: true } },
    },
  })

  if (!tx) return NextResponse.json({ error: '거래 없음' }, { status: 404 })
  if (tx.status !== 'IN_PROGRESS') return NextResponse.json({ error: '진행 중인 거래가 아닙니다' }, { status: 400 })
  if (tx.providerId !== session.user.id && tx.receiverId !== session.user.id) {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  }

  const endedAt = new Date()
  const startedAt = tx.startedAt!

  // 정확한 시간 계산 (초 단위 반올림 후 분으로 변환)
  const durationMs = endedAt.getTime() - startedAt.getTime()
  const durationSeconds = Math.round(durationMs / 1000)
  const durationMinutes = Math.max(1, Math.round(durationSeconds / 60))  // 최소 1분

  // TP 계산: 1 TP/시간 (분 단위 정밀 계산)
  let tcAmount = Math.round((durationMinutes / 60) * 100) / 100

  const receiverBalance = Number(tx.receiver!.tcBalance)

  // -3.0 TP 한도 체크: 수혜자 잔액이 한도 이하로 내려가지 않도록 제한
  const maxPayable = receiverBalance - MIN_BALANCE  // 수혜자가 지불 가능한 최대 TP
  if (maxPayable <= 0) {
    return NextResponse.json({
      error: `수혜자의 TP 잔액이 한도(-3.0 TP)에 도달했습니다. 거래를 진행할 수 없습니다.`,
      receiverBalance,
    }, { status: 400 })
  }

  // 지불 가능 한도 내로 TP 제한
  if (tcAmount > maxPayable) {
    tcAmount = Math.round(maxPayable * 100) / 100
  }

  const [updated] = await prisma.$transaction([
    prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: 'APPROVED',
        endedAt,
        completedAt: endedAt,
        durationMinutes,
        tcAmount,
        baseRate: 1,
      },
    }),
    // 제공자 TP 적립
    prisma.member.update({
      where: { id: tx.providerId! },
      data: {
        tcBalance: { increment: tcAmount },
        lifetimeEarned: { increment: tcAmount },
      },
    }),
    // 수혜자 TP 차감
    prisma.member.update({
      where: { id: tx.receiverId! },
      data: {
        tcBalance: { decrement: tcAmount },
        lifetimeSpent: { increment: tcAmount },
      },
    }),
  ])

  return NextResponse.json({
    transaction: updated,
    durationMinutes,
    tcAmount,
    durationSeconds,
    wasLimited: tcAmount < Math.round((durationMinutes / 60) * 100) / 100,
  })
}
