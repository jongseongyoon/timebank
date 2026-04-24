import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateEarnedTC, calculateSpentTC } from '@/lib/tc-calculator'
import { computeTxHash } from '@/lib/hash'
import { z } from 'zod'

const createSchema = z.object({
  txType: z.enum([
    'PEER_TO_PEER', 'INDIVIDUAL_TO_ORG', 'ORG_TO_INDIVIDUAL',
    'PUBLIC_SERVICE', 'PRIVATE_MARKET', 'FREE_ALLOCATION',
    'WAGE_SUPPLEMENT', 'COMMUNITY_BONUS', 'EXPIRY_DONATION', 'COMMUNITY_FUND_GIFT',
  ]),
  receiverId: z.string().uuid().optional(),
  providerId: z.string().uuid().optional(),
  serviceListingId: z.string().uuid().optional(),
  durationMinutes: z.number().int().min(15).max(480),
  category: z.enum([
    'TRANSPORT', 'SHOPPING', 'COMPANION', 'MEAL', 'HOUSEKEEPING',
    'MEDICAL_ESCORT', 'EDUCATION', 'DIGITAL_HELP', 'REPAIR', 'CHILDCARE',
    'LEGAL_CONSULT', 'HEALTH_CONSULT', 'ADMINISTRATIVE', 'COMMUNITY_EVENT', 'OTHER',
  ]),
  verificationMethod: z.enum(['APP_QR', 'APP_CONFIRM', 'PHONE', 'PAPER', 'COORDINATOR']),
  coordinatorId: z.string().uuid(),
  participantCount: z.number().int().min(1).optional(),
  existingWageKrw: z.number().optional(),
  note: z.string().max(500).optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const data = parsed.data

  const earned = calculateEarnedTC({
    durationMinutes: data.durationMinutes,
    category: data.category as any,
    txType: data.txType as any,
    participantCount: data.participantCount,
    existingWageKrw: data.existingWageKrw,
  })

  const isOrgService = ['INDIVIDUAL_TO_ORG', 'ORG_TO_INDIVIDUAL'].includes(data.txType)
  const spent = calculateSpentTC({
    durationMinutes: data.durationMinutes,
    txType: data.txType as any,
    isOrgService,
  })

  // 수요자 잔액 사전 검증
  if (data.receiverId) {
    const receiver = await prisma.member.findUnique({ where: { id: data.receiverId } })
    if (!receiver) return NextResponse.json({ error: '수요자 없음' }, { status: 404 })
    if (receiver.tcBalance.lessThan(spent)) {
      return NextResponse.json({ error: 'TC_INSUFFICIENT' }, { status: 400 })
    }
  }

  // 코디네이터 이해충돌 검증 (규칙 4)
  if (data.coordinatorId === data.providerId || data.coordinatorId === data.receiverId) {
    return NextResponse.json({ error: 'COORDINATOR_CONFLICT_OF_INTEREST' }, { status: 400 })
  }

  // 이전 거래 해시 조회
  const lastTx = await prisma.transaction.findFirst({ orderBy: { createdAt: 'desc' }, select: { txHash: true } })

  const id = crypto.randomUUID()
  const createdAt = new Date()
  const txHash = computeTxHash({
    id,
    createdAt,
    providerId: data.providerId ?? null,
    receiverId: data.receiverId ?? null,
    tcAmount: earned.totalTC.toString(),
    prevTxHash: lastTx?.txHash ?? null,
  })

  const tx = await prisma.transaction.create({
    data: {
      id,
      createdAt,
      txType: data.txType as any,
      providerId: data.providerId,
      receiverId: data.receiverId,
      serviceListingId: data.serviceListingId,
      durationMinutes: data.durationMinutes,
      tcAmount: earned.totalTC,
      baseRate: earned.rateApplied,
      bonusRate: earned.bonusTC,
      coordinatorId: data.coordinatorId,
      verificationMethod: data.verificationMethod as any,
      prevTxHash: lastTx?.txHash ?? null,
      txHash,
      note: data.note,
    },
  })

  return NextResponse.json({ transaction: tx }, { status: 201 })
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const page = Number(searchParams.get('page') ?? 1)
  const limit = Number(searchParams.get('limit') ?? 20)
  const skip = (page - 1) * limit

  const where = {
    OR: [{ providerId: session.user.id }, { receiverId: session.user.id }],
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        provider: { select: { id: true, name: true } },
        receiver: { select: { id: true, name: true } },
        serviceListing: { select: { title: true, category: true } },
      },
    }),
    prisma.transaction.count({ where }),
  ])

  return NextResponse.json({ transactions, total, page, limit })
}
