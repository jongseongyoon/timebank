export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  transactionId: z.string().uuid(),
})

// QR로 서비스 종료 → 시간 계산 → TC 이전 → APPROVED
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
  const durationMs = endedAt.getTime() - startedAt.getTime()
  const durationMinutes = Math.max(15, Math.round(durationMs / 60000))
  const tcAmount = Math.round((durationMinutes / 60) * 100) / 100  // 1 TC/시간

  const receiver = tx.receiver!
  if (Number(receiver.tcBalance) < tcAmount) {
    return NextResponse.json({ error: '수혜자 TC 잔액 부족' }, { status: 400 })
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
    // 제공자 TC 적립
    prisma.member.update({
      where: { id: tx.providerId! },
      data: {
        tcBalance: { increment: tcAmount },
        lifetimeEarned: { increment: tcAmount },
      },
    }),
    // 수혜자 TC 차감
    prisma.member.update({
      where: { id: tx.receiverId! },
      data: {
        tcBalance: { decrement: tcAmount },
        lifetimeSpent: { increment: tcAmount },
      },
    }),
  ])

  return NextResponse.json({ transaction: updated, durationMinutes, tcAmount })
}
