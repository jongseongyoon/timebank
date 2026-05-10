/**
 * POST /api/social-prescription   처방전 생성
 * GET  /api/social-prescription   처방전 목록 조회
 */
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createPrescription } from '@/lib/social-prescription'

// ── 처방전 생성 ───────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  // 코디네이터·관리자·처방자(PROVIDER 역할로 처방하는 경우) 허용
  const canCreate = session.user.roles.some((r) =>
    ['COORDINATOR', 'ADMIN', 'PROVIDER'].includes(r)
  )
  if (!canCreate) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  try {
    const body = await req.json()

    // 필수 필드 검증
    const required = [
      'receiverId', 'prescriberId', 'prescriberOrg', 'prescriberRole',
      'careLevel', 'prescriptionReason', 'recommendedServices',
      'totalTpGranted', 'monthlyTpLimit', 'validFrom', 'validUntil',
    ]
    for (const field of required) {
      if (body[field] === undefined || body[field] === null) {
        return NextResponse.json({ error: `필수 항목 누락: ${field}` }, { status: 400 })
      }
    }

    const careLevel = Number(body.careLevel)
    if (careLevel < 1 || careLevel > 5) {
      return NextResponse.json({ error: 'careLevel은 1~5 사이여야 합니다.' }, { status: 400 })
    }

    const prescription = await createPrescription({
      receiverId:          body.receiverId,
      prescriberId:        session.user.id,  // 요청자가 처방자
      prescriberOrg:       body.prescriberOrg,
      prescriberRole:      body.prescriberRole,
      careLevel,
      prescriptionReason:  body.prescriptionReason,
      recommendedServices: body.recommendedServices,
      totalTpGranted:      Number(body.totalTpGranted),
      monthlyTpLimit:      Number(body.monthlyTpLimit),
      validFrom:           new Date(body.validFrom),
      validUntil:          new Date(body.validUntil),
      isRenewable:         body.isRenewable ?? true,
      note:                body.note,
    })

    return NextResponse.json({ prescription }, { status: 201 })
  } catch (err: any) {
    console.error('[POST /api/social-prescription]', err)
    return NextResponse.json({ error: err.message ?? '서버 오류' }, { status: 500 })
  }
}

// ── 처방전 목록 ───────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status   = searchParams.get('status') ?? undefined
  const page     = Math.max(1, Number(searchParams.get('page') ?? 1))
  const pageSize = 20

  const isCoordinator = session.user.roles.some((r) => ['COORDINATOR', 'ADMIN'].includes(r))

  // 일반 회원은 자신과 관련된 처방전만 조회
  const where: Record<string, any> = {}
  if (status) where.status = status
  if (!isCoordinator) {
    where.OR = [
      { receiverId:   session.user.id },
      { prescriberId: session.user.id },
    ]
  }

  const [items, total] = await Promise.all([
    prisma.socialPrescription.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip:  (page - 1) * pageSize,
      take:  pageSize,
      include: {
        receiver:    { select: { id: true, name: true, dong: true } },
        prescriber:  { select: { id: true, name: true } },
        coordinator: { select: { id: true, name: true } },
      },
    }),
    prisma.socialPrescription.count({ where }),
  ])

  return NextResponse.json({
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  })
}
