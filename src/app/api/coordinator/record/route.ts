export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import crypto from 'crypto'

const schema = z.object({
  txType: z.enum(['PEER_TO_PEER', 'ORG_TO_INDIVIDUAL', 'INDIVIDUAL_TO_ORG', 'PUBLIC_SERVICE']),
  category: z.enum([
    'TRANSPORT', 'SHOPPING', 'COMPANION', 'MEAL', 'HOUSEKEEPING',
    'MEDICAL_ESCORT', 'EDUCATION', 'DIGITAL_HELP', 'REPAIR', 'CHILDCARE',
    'LEGAL_CONSULT', 'HEALTH_CONSULT', 'ADMINISTRATIVE', 'COMMUNITY_EVENT', 'OTHER',
  ]),
  durationMinutes: z.number().int().min(1),
  tcAmount: z.number().positive(),
  note: z.string().max(500).optional(),
  completedAt: z.string().datetime(),
  receiverId: z.string(),
  providerId: z.string().optional(),       // 개인 제공자
  organizationId: z.string().optional(),   // 단체 제공자
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const isCoordOrAdmin = session.user.roles.some(r => ['COORDINATOR', 'ADMIN'].includes(r))
  if (!isCoordOrAdmin)
    return NextResponse.json({ error: '코디네이터/관리자 권한 필요' }, { status: 403 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { txType, category, durationMinutes, tcAmount, note, completedAt, receiverId, providerId, organizationId } = parsed.data

  // 수혜자 확인
  const receiver = await prisma.member.findUnique({ where: { id: receiverId } })
  if (!receiver) return NextResponse.json({ error: '수혜자 없음' }, { status: 404 })

  // 제공자 확인
  let resolvedProviderId: string | undefined = providerId
  if (organizationId) {
    const org = await prisma.organization.findUnique({ where: { id: organizationId } })
    if (!org) return NextResponse.json({ error: '단체 없음' }, { status: 404 })
    // 단체 제공 시 providerId는 코디네이터 본인으로 기록
    resolvedProviderId = undefined
  } else if (providerId) {
    const provider = await prisma.member.findUnique({ where: { id: providerId } })
    if (!provider) return NextResponse.json({ error: '제공자 없음' }, { status: 404 })
  }

  const txHash = crypto.createHash('sha256')
    .update(`record-${receiverId}-${tcAmount}-${Date.now()}`)
    .digest('hex')

  // 거래 생성 + 잔액 업데이트 (원자적)
  const ops: any[] = [
    prisma.transaction.create({
      data: {
        txType,
        status: 'APPROVED',
        verificationMethod: 'COORDINATOR',
        durationMinutes,
        tcAmount,
        baseRate: parsed.data.tcAmount / (durationMinutes / 60),
        bonusRate: 0,
        txHash,
        note: note ?? `${category} 서비스 완료 (직접 입력)`,
        coordinatorId: session.user.id,
        receiverId,
        ...(resolvedProviderId ? { providerId: resolvedProviderId } : {}),
        ...(organizationId ? { organizationId } : {}),
        completedAt: new Date(completedAt),
      },
    }),
    // 수혜자: TC 차감 (서비스를 받았으므로 지출)
    prisma.member.update({
      where: { id: receiverId },
      data: {
        tcBalance: { decrement: tcAmount },
        lifetimeSpent: { increment: tcAmount },
      },
    }),
  ]

  // 개인 제공자가 있으면 TC 적립
  if (resolvedProviderId) {
    ops.push(
      prisma.member.update({
        where: { id: resolvedProviderId },
        data: {
          tcBalance: { increment: tcAmount },
          lifetimeEarned: { increment: tcAmount },
        },
      })
    )
  }

  // 단체 제공자가 있으면 단체 TC 적립
  if (organizationId) {
    ops.push(
      prisma.organization.update({
        where: { id: organizationId },
        data: { tcBalance: { increment: tcAmount } },
      })
    )
  }

  const results = await prisma.$transaction(ops)
  const tx = results[0]

  return NextResponse.json({ tx }, { status: 201 })
}
