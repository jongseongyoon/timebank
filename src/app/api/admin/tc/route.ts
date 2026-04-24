import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import crypto from 'crypto'

const issueSchema = z.object({
  memberId: z.string(),
  tcAmount: z.number().positive(),
  txType: z.enum(['FREE_ALLOCATION', 'COMMUNITY_BONUS', 'WAGE_SUPPLEMENT', 'COMMUNITY_FUND_GIFT']),
  note: z.string().min(1),
  durationMinutes: z.number().int().min(0).default(0),
})

const correctSchema = z.object({
  txId: z.string(),
  newStatus: z.enum(['CANCEL', 'APPROVE', 'DISPUTE', 'RESOLVE']),
  note: z.string().optional(),
})

// TC 발행
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user.roles.includes('ADMIN'))
    return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 })

  const body = await req.json()
  const { action } = body

  // ── 거래 수정 ──
  if (action === 'correct') {
    const parsed = correctSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

    const STATUS_MAP: Record<string, string> = {
      CANCEL: 'CANCELLED', APPROVE: 'APPROVED', DISPUTE: 'DISPUTED', RESOLVE: 'RESOLVED',
    }
    const newStatus = STATUS_MAP[parsed.data.newStatus] as any
    const tx = await prisma.transaction.findUnique({ where: { id: parsed.data.txId } })
    if (!tx) return NextResponse.json({ error: '거래 없음' }, { status: 404 })

    // APPROVED→CANCELLED 시 잔액 롤백
    if (tx.status === 'APPROVED' && newStatus === 'CANCELLED') {
      await prisma.$transaction([
        prisma.transaction.update({
          where: { id: tx.id },
          data: { status: 'CANCELLED', note: parsed.data.note ?? tx.note },
        }),
        ...(tx.providerId ? [prisma.member.update({
          where: { id: tx.providerId },
          data: {
            tcBalance: { decrement: tx.tcAmount },
            lifetimeEarned: { decrement: tx.tcAmount },
          },
        })] : []),
        ...(tx.receiverId ? [prisma.member.update({
          where: { id: tx.receiverId },
          data: {
            tcBalance: { increment: tx.tcAmount },
            lifetimeSpent: { decrement: tx.tcAmount },
          },
        })] : []),
      ])
    } else {
      await prisma.transaction.update({
        where: { id: tx.id },
        data: { status: newStatus, note: parsed.data.note ?? tx.note },
      })
    }
    return NextResponse.json({ ok: true })
  }

  // ── TC 발행 ──
  const parsed = issueSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const member = await prisma.member.findUnique({ where: { id: parsed.data.memberId } })
  if (!member) return NextResponse.json({ error: '회원 없음' }, { status: 404 })

  const txHash = crypto.createHash('sha256')
    .update(`${parsed.data.memberId}-${parsed.data.tcAmount}-${Date.now()}`)
    .digest('hex')

  const [tx] = await prisma.$transaction([
    prisma.transaction.create({
      data: {
        txType: parsed.data.txType,
        receiverId: parsed.data.memberId,
        coordinatorId: session.user.id,
        verificationMethod: 'COORDINATOR',
        durationMinutes: parsed.data.durationMinutes,
        tcAmount: parsed.data.tcAmount,
        baseRate: 1,
        bonusRate: 0,
        txHash,
        status: 'APPROVED',
        note: parsed.data.note,
      },
    }),
    prisma.member.update({
      where: { id: parsed.data.memberId },
      data: {
        tcBalance: { increment: parsed.data.tcAmount },
        lifetimeEarned: { increment: parsed.data.tcAmount },
      },
    }),
  ])

  return NextResponse.json({ tx }, { status: 201 })
}

// 전체 거래 목록 (관리자용)
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user.roles.includes('ADMIN'))
    return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 })

  const { searchParams } = req.nextUrl
  const status = searchParams.get('status')
  const memberId = searchParams.get('memberId')

  const transactions = await prisma.transaction.findMany({
    where: {
      ...(status ? { status: status as any } : {}),
      ...(memberId ? { OR: [{ providerId: memberId }, { receiverId: memberId }] } : {}),
    },
    include: {
      provider: { select: { id: true, name: true, phone: true } },
      receiver: { select: { id: true, name: true, phone: true } },
      coordinator: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return NextResponse.json({ transactions })
}
