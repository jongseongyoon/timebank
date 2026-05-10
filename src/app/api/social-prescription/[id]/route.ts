/**
 * GET   /api/social-prescription/[id]              처방전 단건 조회
 * PATCH /api/social-prescription/[id]?action=approve|renew|cancel
 */
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  approvePrescription,
  renewPrescription,
  cancelPrescription,
} from '@/lib/social-prescription'
import { prisma } from '@/lib/prisma'

type Params = { params: { id: string } }

// ── 단건 조회 ─────────────────────────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const rx = await prisma.socialPrescription.findUnique({
    where: { id: params.id },
    include: {
      receiver:    { select: { id: true, name: true, dong: true, tpBalance: true } },
      prescriber:  { select: { id: true, name: true } },
      coordinator: { select: { id: true, name: true } },
      history:     { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!rx) return NextResponse.json({ error: '처방전 없음' }, { status: 404 })

  // 권한 확인: 코디/관리자 또는 처방 당사자만 조회 가능
  const isCoordinator = session.user.roles.some((r) => ['COORDINATOR', 'ADMIN'].includes(r))
  const isConcerned   = rx.receiverId === session.user.id || rx.prescriberId === session.user.id
  if (!isCoordinator && !isConcerned) {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  }

  return NextResponse.json({ prescription: rx })
}

// ── 상태 변경 (승인·갱신·취소) ───────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const isCoordinator = session.user.roles.some((r) => ['COORDINATOR', 'ADMIN'].includes(r))

  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')

  try {
    const body = await req.json().catch(() => ({}))

    // ── 승인 ──────────────────────────────────────────────────────────────────
    if (action === 'approve') {
      if (!isCoordinator) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

      const updated = await approvePrescription({
        prescriptionId: params.id,
        coordinatorId:  session.user.id,
        note:           body.note,
      })
      return NextResponse.json({ prescription: updated })
    }

    // ── 갱신 ──────────────────────────────────────────────────────────────────
    if (action === 'renew') {
      if (!isCoordinator) return NextResponse.json({ error: '권한 없음' }, { status: 403 })
      if (!body.newValidUntil) {
        return NextResponse.json({ error: 'newValidUntil 필수' }, { status: 400 })
      }

      const updated = await renewPrescription({
        prescriptionId: params.id,
        coordinatorId:  session.user.id,
        newValidUntil:  new Date(body.newValidUntil),
        additionalTp:   body.additionalTp ? Number(body.additionalTp) : undefined,
        note:           body.note,
      })
      return NextResponse.json({ prescription: updated })
    }

    // ── 취소 ──────────────────────────────────────────────────────────────────
    if (action === 'cancel') {
      // 코디네이터 또는 처방전의 처방자 본인만 취소 가능
      const rx = await prisma.socialPrescription.findUnique({ where: { id: params.id } })
      if (!rx) return NextResponse.json({ error: '처방전 없음' }, { status: 404 })

      const canCancel = isCoordinator || rx.prescriberId === session.user.id
      if (!canCancel) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

      const updated = await cancelPrescription({
        prescriptionId: params.id,
        performedBy:    session.user.id,
        reason:         body.reason ?? '취소',
      })
      return NextResponse.json({ prescription: updated })
    }

    return NextResponse.json({ error: '유효하지 않은 action (approve|renew|cancel)' }, { status: 400 })
  } catch (err: any) {
    console.error(`[PATCH /api/social-prescription/${params.id}]`, err)
    return NextResponse.json({ error: err.message ?? '서버 오류' }, { status: 500 })
  }
}
