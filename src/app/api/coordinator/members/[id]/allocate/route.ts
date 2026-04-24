import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { computeTxHash } from '@/lib/hash'
import { z } from 'zod'

const schema = z.object({
  tcAmount: z.number().min(1).max(50),
  note: z.string().max(200).optional(),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const isCoordinator = session.user.roles.some((r) => ['COORDINATOR', 'ADMIN'].includes(r))
  if (!isCoordinator) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const target = await prisma.member.findUnique({ where: { id: params.id } })
  if (!target) return NextResponse.json({ error: '회원 없음' }, { status: 404 })
  if (!target.isVulnerable) return NextResponse.json({ error: '취약계층 회원만 배분 가능' }, { status: 400 })

  const lastTx = await prisma.transaction.findFirst({ orderBy: { createdAt: 'desc' }, select: { txHash: true } })

  const id = crypto.randomUUID()
  const createdAt = new Date()
  const txHash = computeTxHash({
    id,
    createdAt,
    providerId: null,
    receiverId: params.id,
    tcAmount: String(parsed.data.tcAmount),
    prevTxHash: lastTx?.txHash ?? null,
  })

  const result = await prisma.$transaction(async (trx) => {
    const tx = await trx.transaction.create({
      data: {
        id,
        createdAt,
        txType: 'FREE_ALLOCATION',
        receiverId: params.id,
        coordinatorId: session.user.id,
        durationMinutes: 0,
        tcAmount: parsed.data.tcAmount,
        baseRate: 0,
        bonusRate: 0,
        verificationMethod: 'COORDINATOR',
        prevTxHash: lastTx?.txHash ?? null,
        txHash,
        status: 'APPROVED',
        note: parsed.data.note ?? '취약계층 기초 TC 배분',
      },
    })

    await trx.member.update({
      where: { id: params.id },
      data: {
        tcBalance: { increment: parsed.data.tcAmount },
        lifetimeEarned: { increment: parsed.data.tcAmount },
      },
    })

    await trx.notification.create({
      data: {
        memberId: params.id,
        type: 'TC_ALLOCATED',
        title: '기초 TC 배분',
        body: `${parsed.data.tcAmount} TC가 배분되었습니다.`,
        link: '/wallet',
      },
    })

    return tx
  })

  return NextResponse.json({ transaction: result }, { status: 201 })
}
