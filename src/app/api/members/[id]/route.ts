import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function isCoordinator(roles: string[]) {
  return roles.some((r) => ['COORDINATOR', 'ADMIN'].includes(r))
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  if (!isCoordinator(session.user.roles)) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const member = await prisma.member.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      phone: true,
      dong: true,
      roles: true,
      status: true,
      isVulnerable: true,
      isDisabled: true,
      tcBalance: true,
      lifetimeEarned: true,
      lifetimeSpent: true,
      tcExpiresAt: true,
      createdAt: true,
    },
  })

  if (!member) return NextResponse.json({ error: '회원 없음' }, { status: 404 })
  return NextResponse.json({ member })
}
