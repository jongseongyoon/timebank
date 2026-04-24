export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { z } from 'zod'

const schema = z.object({
  receiverId: z.string().uuid(),
  tcAmount: z.number().positive().max(100),
  note: z.string().max(200).optional(),
})

// QR 스캔을 통한 TC 직접 송금 (제공자 → 수신자)
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { receiverId, tcAmount, note } = parsed.data
  const senderId = session.user.id

  if (senderId === receiverId) return NextResponse.json({ error: '자기 자신에게 송금 불가' }, { status: 400 })

  const sender = await prisma.member.findUnique({ where: { id: senderId } })
  if (!sender) return NextResponse.json({ error: '송신자 없음' }, { status: 404 })
  if (Number(sender.tcBalance) < tcAmount) return NextResponse.json({ error: 'TC 잔액 부족' }, { status: 400 })

  const receiver = await prisma.member.findUnique({ where: { id: receiverId } })
  if (!receiver) return NextResponse.json({ error: '수신자 없음' }, { status: 404 })

  const txHash = crypto.createHash('sha256')
    .update(`qr-transfer-${senderId}-${receiverId}-${tcAmount}-${Date.now()}`)
    .digest('hex')

  const [tx] = await prisma.$transaction([
    prisma.transaction.create({
      data: {
        txType: 'PEER_TO_PEER',
        status: 'APPROVED',
        verificationMethod: 'APP_QR',
        durationMinutes: 0,
        tcAmount,
        baseRate: 0,
        bonusRate: 0,
        txHash,
        note: note ?? 'QR 직접 송금',
        coordinatorId: senderId, // 자기 확인
        providerId: senderId,
        receiverId,
        completedAt: new Date(),
      },
    }),
    prisma.member.update({
      where: { id: senderId },
      data: {
        tcBalance: { decrement: tcAmount },
        lifetimeSpent: { increment: tcAmount },
      },
    }),
    prisma.member.update({
      where: { id: receiverId },
      data: {
        tcBalance: { increment: tcAmount },
        lifetimeEarned: { increment: tcAmount },
      },
    }),
  ])

  return NextResponse.json({ transaction: tx }, { status: 201 })
}
