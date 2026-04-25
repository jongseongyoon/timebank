export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const baseSchema = z.object({
  title: z.string().min(2).max(50),
  description: z.string().max(500).optional(),
  category: z.enum([
    'TRANSPORT', 'SHOPPING', 'COMPANION', 'MEAL', 'HOUSEKEEPING',
    'MEDICAL_ESCORT', 'EDUCATION', 'DIGITAL_HELP', 'REPAIR', 'CHILDCARE',
    'LEGAL_CONSULT', 'HEALTH_CONSULT', 'ADMINISTRATIVE', 'COMMUNITY_EVENT', 'OTHER',
  ]),
  tcPerHour: z.number().min(0.5).max(3),
  availableDong: z.array(z.string()).min(1),
  availableDays: z.array(z.enum(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'])).min(1),
  availableTimeFrom: z.string().regex(/^\d{2}:\d{2}$/),
  availableTimeTo: z.string().regex(/^\d{2}:\d{2}$/),
  organizationId: z.string().optional(), // 단체 서비스 등록 시
  latitude: z.number().optional(),
  longitude: z.number().optional(),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const category = searchParams.get('category')
  const dong = searchParams.get('dong')
  const orgOnly = searchParams.get('orgOnly') === 'true'

  const listings = await prisma.serviceListing.findMany({
    where: {
      isActive: true,
      ...(category ? { category: category as any } : {}),
      ...(dong ? { availableDong: { has: dong } } : {}),
      ...(orgOnly ? { organizationId: { not: null } } : {}),
    },
    include: {
      provider: { select: { id: true, name: true, dong: true, phone: true } },
      organization: { select: { id: true, name: true, orgType: true, dong: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return NextResponse.json({ listings })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = await req.json()
  const parsed = baseSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { organizationId, ...data } = parsed.data

  // 단체 서비스: COORDINATOR 또는 ADMIN만 등록 가능
  if (organizationId) {
    const isCoordOrAdmin = session.user.roles.some(r => ['COORDINATOR', 'ADMIN'].includes(r))
    if (!isCoordOrAdmin)
      return NextResponse.json({ error: '코디네이터/관리자 권한 필요' }, { status: 403 })

    const org = await prisma.organization.findUnique({ where: { id: organizationId } })
    if (!org) return NextResponse.json({ error: '단체 없음' }, { status: 404 })

    const listing = await prisma.serviceListing.create({
      data: { ...data, organizationId, providerId: session.user.id },
    })
    return NextResponse.json({ listing }, { status: 201 })
  }

  // 개인 서비스: PROVIDER 권한 필요
  if (!session.user.roles.includes('PROVIDER'))
    return NextResponse.json({ error: '제공자 권한 필요' }, { status: 403 })

  const listing = await prisma.serviceListing.create({
    data: { ...data, providerId: session.user.id },
  })
  return NextResponse.json({ listing }, { status: 201 })
}
