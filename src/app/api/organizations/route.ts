import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(2).max(50),
  orgType: z.enum([
    'COMMUNITY_COUNCIL', 'WELFARE_COUNCIL', 'SAEMAEUL', 'WOMENS_CLUB',
    'RIGHT_LIVING', 'VOLUNTEER_CAMP', 'RED_CROSS', 'SOCIAL_COOP', 'OTHER',
  ]),
  dong: z.string().min(1),
})

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const organizations = await prisma.organization.findMany({
    select: { id: true, name: true, orgType: true, dong: true, tcBalance: true },
    orderBy: [{ dong: 'asc' }, { name: 'asc' }],
  })
  return NextResponse.json({ organizations })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user.roles.includes('ADMIN'))
    return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const org = await prisma.organization.create({ data: parsed.data })
  return NextResponse.json({ org }, { status: 201 })
}
