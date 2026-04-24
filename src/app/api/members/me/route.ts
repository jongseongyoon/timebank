export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  address: z.string().optional(),
  email: z.string().email().optional(),
  dong: z.string().optional(),
})

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const member = await prisma.member.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      dong: true,
      address: true,
      birthYear: true,
      memberType: true,
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

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const member = await prisma.member.update({
    where: { id: session.user.id },
    data: parsed.data,
    select: { id: true, name: true, dong: true, address: true, email: true },
  })

  return NextResponse.json({ member })
}
