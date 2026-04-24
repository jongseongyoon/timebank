import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const isCoordinator = session.user.roles.some((r) => ['COORDINATOR', 'ADMIN'].includes(r))
  if (!isCoordinator) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const { searchParams } = req.nextUrl
  const status = searchParams.get('status') ?? 'OPEN'
  const dong = searchParams.get('dong') ?? session.user.dong

  const requests = await prisma.serviceRequest.findMany({
    where: { status: status as any, dong },
    include: {
      requester: { select: { id: true, name: true, phone: true, isVulnerable: true } },
    },
    orderBy: [
      { urgency: 'asc' },   // EMERGENCY → URGENT → NORMAL
      { createdAt: 'asc' },
    ],
  })

  return NextResponse.json({ requests })
}
