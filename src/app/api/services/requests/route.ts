export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  category: z.enum([
    'TRANSPORT', 'SHOPPING', 'COMPANION', 'MEAL', 'HOUSEKEEPING',
    'MEDICAL_ESCORT', 'EDUCATION', 'DIGITAL_HELP', 'REPAIR', 'CHILDCARE',
    'LEGAL_CONSULT', 'HEALTH_CONSULT', 'ADMINISTRATIVE', 'COMMUNITY_EVENT', 'OTHER',
  ]),
  description: z.string().min(10).max(500),
  requestedDate: z.string().datetime(),
  durationMinutes: z.number().int().min(15).max(480),
  dong: z.string().min(1),
  urgency: z.enum(['EMERGENCY', 'URGENT', 'NORMAL']).default('NORMAL'),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const request = await prisma.serviceRequest.create({
    data: {
      ...parsed.data,
      requestedDate: new Date(parsed.data.requestedDate),
      requesterId: session.user.id,
    },
  })

  return NextResponse.json({ request }, { status: 201 })
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const isCoordinator = session.user.roles.some((r) => ['COORDINATOR', 'ADMIN'].includes(r))

  const { searchParams } = req.nextUrl
  const status = searchParams.get('status')
  const urgency = searchParams.get('urgency')

  const mine = searchParams.get('mine') === 'true'

  const where: any = {}
  if (!isCoordinator || mine) where.requesterId = session.user.id
  if (status) where.status = status
  if (urgency) where.urgency = urgency

  const requests = await prisma.serviceRequest.findMany({
    where,
    include: {
      requester: { select: { id: true, name: true, dong: true } },
    },
    orderBy: [{ urgency: 'asc' }, { createdAt: 'asc' }],
    take: 50,
  })

  return NextResponse.json({ requests })
}
