export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { awardWalkReward, GOAL_STEPS, type WalkRewardResult } from '@/lib/walk-service'
import { kstToday, validateWalkDate } from '@/lib/kst'

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

  // KST 기준 날짜 (클라이언트 지정 허용: 오늘·어제만)
  const date = validateWalkDate(body.date)
  const today = kstToday()

  // 미래 날짜 거부
  if (date > today) {
    return NextResponse.json({ error: '미래 날짜는 허용되지 않습니다' }, { status: 400 })
  }

  const memberId = session.user.id

  // ── 원자적 걸음 수 업데이트 (EC-13: findUnique→upsert stale read 해소) ──────
  // ① 레코드 없으면 생성 (update: {} 는 no-op — conflict 시 건드리지 않음)
  await prisma.walkRecord.upsert({
    where:  { memberId_date: { memberId, date } },
    create: { memberId, date, steps },
    update: {},
  })
  // ② DB 현재값보다 클 때만 업데이트 — Postgres 행 잠금으로 동시 요청도 안전
  //    "steps 감소 불가" 보장: lt 조건 불일치 시 아무것도 하지 않음
  await prisma.walkRecord.updateMany({
    where: { memberId, date, steps: { lt: steps } },
    data:  { steps },
  })
  // ③ 권위 있는 최신 상태 읽기
  const record = await prisma.walkRecord.findUniqueOrThrow({
    where: { memberId_date: { memberId, date } },
  })
  const newSteps = record.steps

  // ── TP 보상 (EC-11: 어제 날짜 소급 지급 창 제한) ───────────────────────────
  // TP는 오늘 날짜가 원칙. 어제 날짜는 KST 03:00 이전(야간 미동기 구제 창)만 허용
  const kstHour        = new Date(Date.now() + 9 * 3600_000).getUTCHours()
  const tpDateAllowed  = date === today || (date < today && kstHour < 3)

  let rewardResult: WalkRewardResult = {
    rewarded: false, tpTotal: 0, tpFromFund: 0, tpFromCirculation: 0,
  }

  if (!record.rewarded && newSteps >= GOAL_STEPS && tpDateAllowed) {
    const admin = await prisma.member.findFirst({
      where: { roles: { has: 'ADMIN' } },
      select: { id: true },
    })
    const coordinatorId = admin?.id ?? memberId
    rewardResult = await awardWalkReward(memberId, date, newSteps, coordinatorId)
  }

  return NextResponse.json({
    steps:             newSteps,
    rewarded:          record.rewarded || rewardResult.rewarded,
    rewardedNow:       rewardResult.rewarded,
    tpFromFund:        rewardResult.tpFromFund,
    tpFromCirculation: rewardResult.tpFromCirculation,
    tpTotal:           rewardResult.tpTotal,
    fundReason:        rewardResult.reason,
    goal:              GOAL_STEPS,
    date,
  })
}
