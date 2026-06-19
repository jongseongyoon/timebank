/**
 * POST /api/social-prescription   처방전 생성
 * GET  /api/social-prescription   처방전 목록 조회
 */
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { issuePrescription } from '@/lib/social-prescription'

// ── 처방전 발급 (대상자: 기존 회원 또는 신규 회원 동시 등록) ────────────────────
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  // 처방자(PRESCRIBER)·관리자·코디네이터 허용
  const canCreate = session.user.roles.some((r) =>
    ['PRESCRIBER', 'ADMIN', 'COORDINATOR'].includes(r)
  )
  if (!canCreate) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  try {
    const body = await req.json()

    // 대상자: receiverId(기존) 또는 newReceiver(신규) 중 하나 필수
    if (!body.receiverId && !body.newReceiver) {
      return NextResponse.json({ error: '대상자를 선택하거나 신규 회원을 입력하세요.' }, { status: 400 })
    }

    // 신규 회원 필수 필드 검증
    if (body.newReceiver) {
      const nr = body.newReceiver
      if (!nr.name || !nr.phone || !nr.dong) {
        return NextResponse.json({ error: '신규 회원: 이름·전화번호·동은 필수입니다.' }, { status: 400 })
      }
      if (!/^010-\d{4}-\d{4}$/.test(nr.phone)) {
        return NextResponse.json({ error: '전화번호 형식: 010-0000-0000' }, { status: 400 })
      }
      if (nr.birthDate && !/^\d{8}$/.test(nr.birthDate)) {
        return NextResponse.json({ error: '생년월일은 8자리(YYYYMMDD)로 입력하세요.' }, { status: 400 })
      }
    }

    // 처방 공통 필수 필드 검증
    const required = [
      'prescriberOrg', 'prescriberRole', 'careLevel',
      'prescriptionReason', 'recommendedServices',
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
    if (!Array.isArray(body.prescriptionReason) || body.prescriptionReason.length === 0) {
      return NextResponse.json({ error: '처방 사유를 1개 이상 선택하세요.' }, { status: 400 })
    }
    if (Number(body.totalTpGranted) <= 0) {
      return NextResponse.json({ error: '지급 TP는 0보다 커야 합니다.' }, { status: 400 })
    }

    const result = await issuePrescription({
      receiverId:          body.receiverId,
      newReceiver:         body.newReceiver,
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

    return NextResponse.json(result, { status: 201 })
  } catch (err: any) {
    console.error('[POST /api/social-prescription]', err.message ?? err)
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
        history:     { orderBy: { createdAt: 'desc' }, take: 5 },
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
