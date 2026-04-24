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
  const dong = searchParams.get('dong') ?? session.user.dong
  const search = searchParams.get('search') ?? ''
  const role = searchParams.get('role')

  const members = await prisma.member.findMany({
    where: {
      dong,
      status: 'ACTIVE',
      ...(search ? { name: { contains: search } } : {}),
      ...(role ? { roles: { has: role as any } } : {}),
    },
    select: {
      id: true,
      name: true,
      phone: true,
      roles: true,
      isVulnerable: true,
      isDisabled: true,
      tcBalance: true,
      tcExpiresAt: true,
      createdAt: true,
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({ members })
}
