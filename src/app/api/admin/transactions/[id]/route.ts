export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const editSchema = z.object({
  note: z.string().max(500).optional(),
  status: z.enum(['PENDING', 'APPROVED', 'CANCELLED', 'DISPUTED', 'RESOLVED']).optional(),
})

// 관리자 거래 수정
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  if (!session.user.roles.includes('ADMIN')) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const body = await req.json()
  const parsed = editSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const tx = await prisma.transaction.findUnique({ where: { id: params.id } })
  if (!tx) return NextResponse.json({ error: '거래 없음' }, { status: 404 })

  const updated = await prisma.transaction.update({
    where: { id: params.id },
    data: parsed.data,
  })

  await prisma.auditLog.create({
    data: {
      adminId: session.user.id,
      action: 'TRANSACTION_EDIT',
      targetId: params.id,
      details: JSON.stringify({ before: { note: tx.note, status: tx.status }, after: parsed.data }),
    },
  })

  return NextResponse.json({ transaction: updated })
}

// 관리자 거래 삭제 + TC 자동 복구
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  if (!session.user.roles.includes('ADMIN')) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const tx = await prisma.transaction.findUnique({
    where: { id: params.id },
    include: { careSession: { select: { id: true } } },
  })
  if (!tx) return NextResponse.json({ error: '거래 없음' }, { status: 404 })

  const tcAmount = Number(tx.tcAmount)
  const ops: any[] = []

  // APPROVED 거래만 TC 복구
  if (tx.status === 'APPROVED') {
    // 제공자 TC 차감 복구
    if (tx.providerId) {
      ops.push(
        prisma.member.update({
          where: { id: tx.providerId },
          data: {
            tcBalance: { decrement: tcAmount },
            lifetimeEarned: { decrement: tcAmount },
          },
        })
      )
    }
    // 수혜자 TC 증가 복구
    if (tx.receiverId) {
      ops.push(
        prisma.member.update({
          where: { id: tx.receiverId },
          data: {
            tcBalance: { increment: tcAmount },
            lifetimeSpent: { decrement: tcAmount },
          },
        })
      )
    }
  }

  ops.push(
    prisma.auditLog.create({
      data: {
        adminId: session.user.id,
        action: 'TRANSACTION_DELETE',
        targetId: params.id,
        details: JSON.stringify({
          txType: tx.txType, tcAmount, status: tx.status,
          providerId: tx.providerId, receiverId: tx.receiverId,
          note: tx.note,
        }),
      },
    })
  )

  // 연결된 CareSession 해제
  if (tx.careSession) {
    ops.push(
      prisma.careSession.update({
        where: { transactionId: params.id },
        data: { transactionId: null, status: 'SCHEDULED' },
      })
    )
  }

  await prisma.$transaction(ops)
  await prisma.transaction.delete({ where: { id: params.id } })

  return NextResponse.json({ ok: true, tcRestored: tx.status === 'APPROVED' ? tcAmount : 0 })
}
