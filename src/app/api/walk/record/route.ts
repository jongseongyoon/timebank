/**
 * POST /api/walk/record
 * 걸음수 서버 저장 전용 — TP 지급 없음
 *
 * 목적: APK/웹에서 걸음수를 주기적으로 서버에 기록하기 위해
 *       TP 지급 로직과 분리된 순수 저장 엔드포인트
 */
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { kstToday, validateWalkDate } from '@/lib/kst'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const steps: number =
    typeof body.steps === 'number' ? Math.max(0, Math.round(body.steps)) : 0
  const memberId = session.user.id

  // KST 기준 날짜 (클라이언트 지정 허용: 오늘·어제만)
  const date  = validateWalkDate(body.date)
  const today = kstToday()

  // 미래 날짜 거부
  if (date > today) {
    return NextResponse.json({ error: '미래 날짜는 허용되지 않습니다' }, { status: 400 })
  }

  if (steps === 0) {
    const existing = await prisma.walkRecord.findUnique({
      where: { memberId_date: { memberId, date } },
    })
    return NextResponse.json({
      steps:      existing?.steps     ?? 0,
      rewarded:   existing?.rewarded  ?? false,
      goalReached: (existing?.steps ?? 0) >= 10000,
      date,
      saved: false,
    })
  }

  // 기존 기록 조회 (걸음수는 감소하지 않음 — 항상 최댓값 유지)
  const existing = await prisma.walkRecord.findUnique({
    where: { memberId_date: { memberId, date } },
  })
  const newSteps = Math.max(existing?.steps ?? 0, steps)

  // 변화가 없으면 DB 쓰기 생략
  if (existing && existing.steps === newSteps) {
    return NextResponse.json({
      steps:      newSteps,
      rewarded:   existing.rewarded,
      goalReached: newSteps >= 10000,
      date,
      saved: false,
    })
  }

  const record = await prisma.walkRecord.upsert({
    where:  { memberId_date: { memberId, date } },
    update: { steps: newSteps },
    create: { memberId, date, steps: newSteps },
  })

  return NextResponse.json({
    steps:      record.steps,
    rewarded:   record.rewarded,
    goalReached: record.steps >= 10000,
    date,
    saved: true,
  })
}
