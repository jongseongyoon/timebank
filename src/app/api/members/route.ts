export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const isCoordOrAdmin = session.user.roles.some((r) => ['COORDINATOR', 'ADMIN'].includes(r))
  if (!isCoordOrAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const phone = req.nextUrl.searchParams.get('phone')
  const search = req.nextUrl.searchParams.get('search')
  const roleFilter = req.nextUrl.searchParams.get('role')

  const where: any = { status: 'ACTIVE' }
  if (phone) where.phone = phone
  if (search) where.name = { contains: search }
  if (roleFilter) where.roles = { has: roleFilter }

  const members = await prisma.member.findMany({
    where,
    select: {
      id: true,
      name: true,
      phone: true,
      dong: true,
      roles: true,
      tcBalance: true,
      isVulnerable: true,
      isDisabled: true,
      createdAt: true,
      tcExpiresAt: true,
    },
    take: 50,
    orderBy: { name: 'asc' },
  })

  return NextResponse.json({ members })
}
