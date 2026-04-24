export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  title: z.string().min(2).max(100),
  category: z.enum([
    'TRANSPORT','SHOPPING','COMPANION','MEAL','HOUSEKEEPING',
    'MEDICAL_ESCORT','EDUCATION','DIGITAL_HELP','REPAIR','CHILDCARE',
    'LEGAL_CONSULT','HEALTH_CONSULT','ADMINISTRATIVE','COMMUNITY_EVENT','OTHER',
  ]),
  description: z.string().max(500).optional(),
  recipientId: z.string(),
  organizationId: z.string().optional(),
  totalTcAmount: z.number().positive(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  dailyHours: z.number().min(0.5).max(24),
  totalDays: z.number().int().min(1),
  note: z.string().max(500).optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const isCoordOrAdmin = session.user.roles.some(r => ['COORDINATOR', 'ADMIN'].includes(r))
  if (!isCoordOrAdmin) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const { searchParams } = req.nextUrl
  const status = searchParams.get('status')
  const recipientId = searchParams.get('recipientId')

  const packages = await prisma.carePackage.findMany({
    where: {
      ...(status ? { status: status as any } : {}),
      ...(recipientId ? { recipientId } : {}),
    },
    include: {
      recipient: { select: { id: true, name: true, dong: true, tcBalance: true } },
      organization: { select: { id: true, name: true, dong: true, orgType: true } },
      coordinator: { select: { id: true, name: true } },
      sessions: {
        include: {
          provider: { select: { id: true, name: true, dong: true } },
        },
        orderBy: { scheduledAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ packages })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const isCoordOrAdmin = session.user.roles.some(r => ['COORDINATOR', 'ADMIN'].includes(r))
  if (!isCoordOrAdmin) return NextResponse.json({ error: '코디네이터/관리자 권한 필요' }, { status: 403 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const d = parsed.data

  // 수혜자 확인
  const recipient = await prisma.member.findUnique({ where: { id: d.recipientId } })
  if (!recipient) return NextResponse.json({ error: '수혜자 없음' }, { status: 404 })

  // 단체 확인
  if (d.organizationId) {
    const org = await prisma.organization.findUnique({ where: { id: d.organizationId } })
    if (!org) return NextResponse.json({ error: '단체 없음' }, { status: 404 })
  }

  const pkg = await prisma.carePackage.create({
    data: {
      title: d.title,
      category: d.category as any,
      description: d.description,
      recipientId: d.recipientId,
      organizationId: d.organizationId,
      totalTcAmount: d.totalTcAmount,
      startDate: new Date(d.startDate),
      endDate: new Date(d.endDate),
      dailyHours: d.dailyHours,
      totalDays: d.totalDays,
      note: d.note,
      coordinatorId: session.user.id,
      status: 'ACTIVE',
    },
    include: {
      recipient: { select: { id: true, name: true, dong: true } },
      organization: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json({ pkg }, { status: 201 })
}
