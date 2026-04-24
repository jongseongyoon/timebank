export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const isCoordinator = session.user.roles.some((r) => ['COORDINATOR', 'ADMIN'].includes(r))
  if (!isCoordinator) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const { searchParams } = req.nextUrl
  const status = searchParams.get('status') ?? 'PENDING'

  const transactions = await prisma.transaction.findMany({
    where: {
      coordinatorId: session.user.id,
      status: status as any,
    },
    include: {
      provider: { select: { id: true, name: true, dong: true } },
      receiver: { select: { id: true, name: true, dong: true } },
      serviceListing: { select: { title: true, category: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return NextResponse.json({ transactions })
}
