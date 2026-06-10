/**
 * POST /api/walk/record
 * 걸음수 서버 저장 + 1만보 도달 시 즉시 TP 지급
 *
 * 백그라운드 주기 저장에서도 목표 도달 즉시 지급되도록
 * awardWalkReward를 호출합니다 (원자적 클레임이라 중복 지급 불가).
 */
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { kstToday, validateWalkDate } from '@/lib/kst'
import { awardWalkReward, GOAL_STEPS } from '@/lib/walk-service'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  // 하루 최대 100,000보 상한 — 비정상 데이터·공격 방어
  const MAX_DAILY_STEPS = 100_000
  const steps: number =
    typeof body.steps === 'number'
      ? Math.min(Math.max(0, Math.round(body.steps)), MAX_DAILY_STEPS)
      : 0
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

  // ── 원자적 걸음 수 업데이트 (EC-13: stale read 해소) ────────────────────────
  // ① 없으면 생성, 있으면 건드리지 않음
  await prisma.walkRecord.upsert({
    where:  { memberId_date: { memberId, date } },
    create: { memberId, date, steps },
    update: {},
  })
  // ② DB 값보다 클 때만 업데이트 — 동시 요청도 행 잠금으로 직렬화됨
  const updated = await prisma.walkRecord.updateMany({
    where: { memberId, date, steps: { lt: steps } },
    data:  { steps },
  })
  // ③ 최신 상태 읽기
  const record = await prisma.walkRecord.findUniqueOrThrow({
    where: { memberId_date: { memberId, date } },
  })

  // ── 1만보 도달 즉시 TP 지급 (오늘 날짜만) ──────────────────────────────────
  let rewardedNow = false
  if (!record.rewarded && record.steps >= GOAL_STEPS && date === today) {
    const admin = await prisma.member.findFirst({
      where:  { roles: { has: 'ADMIN' } },
      select: { id: true },
    })
    const result = await awardWalkReward(memberId, date, record.steps, admin?.id ?? memberId)
    rewardedNow = result.rewarded
  }

  return NextResponse.json({
    steps:       record.steps,
    rewarded:    record.rewarded || rewardedNow,
    rewardedNow,
    goalReached: record.steps >= GOAL_STEPS,
    date,
    saved: updated.count > 0,  // 실제로 변경된 경우만 true
  })
}
