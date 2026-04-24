export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const isCoordinator = session.user.roles.some((r) => ['COORDINATOR', 'ADMIN'].includes(r))
  if (!isCoordinator) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const dong = session.user.dong

  const [pendingTxCount, emergencyRequests, recentApproved, memberCount] = await Promise.all([
    prisma.transaction.count({ where: { status: 'PENDING', coordinator: { dong } } }),
    prisma.serviceRequest.findMany({
      where: { status: 'OPEN', urgency: 'EMERGENCY', dong },
      include: { requester: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
      take: 10,
    }),
    prisma.transaction.findMany({
      where: { status: 'APPROVED', coordinatorId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        provider: { select: { name: true } },
        receiver: { select: { name: true } },
      },
    }),
    prisma.member.count({ where: { dong, status: 'ACTIVE' } }),
  ])

  return NextResponse.json({ pendingTxCount, emergencyRequests, recentApproved, memberCount, dong })
}
