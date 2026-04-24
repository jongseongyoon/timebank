export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { z } from 'zod'

const schema = z.object({
  memberId: z.string().uuid(),
  tcAmount: z.number().positive().max(10000),
  reason: z.string().min(2).max(300),
})

// 개별 TC 배분
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const isAdmin = session.user.roles.includes('ADMIN')
  if (!isAdmin) return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { memberId, tcAmount, reason } = parsed.data

  const target = await prisma.member.findUnique({ where: { id: memberId } })
  if (!target) return NextResponse.json({ error: '회원 없음' }, { status: 404 })

  const txHash = crypto.createHash('sha256')
    .update(`admin-allocate-${memberId}-${tcAmount}-${Date.now()}`)
    .digest('hex')

  await prisma.$transaction([
    // 거래 생성
    prisma.transaction.create({
      data: {
        txType: 'FREE_ALLOCATION',
        status: 'APPROVED',
        verificationMethod: 'COORDINATOR',
        durationMinutes: 0,
        tcAmount,
        baseRate: 0,
        bonusRate: 0,
        txHash,
        note: reason,
        coordinatorId: session.user.id,
        receiverId: memberId,
        completedAt: new Date(),
      },
    }),
    // 수혜자 TC 증가
    prisma.member.update({
      where: { id: memberId },
      data: {
        tcBalance: { increment: tcAmount },
        lifetimeEarned: { increment: tcAmount },
      },
    }),
    // 감사 로그
    prisma.auditLog.create({
      data: {
        adminId: session.user.id,
        action: 'TC_ALLOCATE',
        targetId: memberId,
        details: JSON.stringify({ memberId, tcAmount, reason, targetName: target.name }),
      },
    }),
  ])

  return NextResponse.json({ ok: true, memberId, tcAmount })
}

// 배분 현황 조회
export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  if (!session.user.roles.includes('ADMIN')) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const [allocations, memberStats] = await Promise.all([
    prisma.transaction.aggregate({
      where: { txType: 'FREE_ALLOCATION', status: 'APPROVED' },
      _sum: { tcAmount: true },
      _count: true,
    }),
    prisma.member.aggregate({
      _sum: { tcBalance: true, lifetimeEarned: true },
      _count: true,
    }),
  ])

  const recentLogs = await prisma.auditLog.findMany({
    where: { action: 'TC_ALLOCATE' },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return NextResponse.json({
    totalAllocated: Number(allocations._sum.tcAmount ?? 0),
    allocationCount: allocations._count,
    totalMemberBalance: Number(memberStats._sum.tcBalance ?? 0),
    totalLifetimeEarned: Number(memberStats._sum.lifetimeEarned ?? 0),
    memberCount: memberStats._count,
    recentLogs,
  })
}
