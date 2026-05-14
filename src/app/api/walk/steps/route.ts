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
  const steps: number =
    typeof body.steps === 'number' ? Math.max(0, Math.round(body.steps)) : 0

  // KST 기준 날짜 (클라이언트 지정 허용: 오늘·어제만)
  const date = validateWalkDate(body.date)
  const today = kstToday()

  // 미래 날짜 거부
  if (date > today) {
    return NextResponse.json({ error: '미래 날짜는 허용되지 않습니다' }, { status: 400 })
  }

  const memberId = session.user.id

  // 기존 기록 조회 (걸음 수는 감소하지 않음)
  const existing = await prisma.walkRecord.findUnique({
    where: { memberId_date: { memberId, date } },
  })

  const newSteps = Math.max(existing?.steps ?? 0, steps)

  const record = await prisma.walkRecord.upsert({
    where: { memberId_date: { memberId, date } },
    update: { steps: newSteps },
    create: { memberId, date, steps: newSteps },
  })

  // 목표 달성 + 미지급 → TP 보상
  let rewardResult: WalkRewardResult = {
    rewarded: false,
    tpTotal: 0,
    tpFromFund: 0,
    tpFromCirculation: 0,
  }

  if (!record.rewarded && newSteps >= GOAL_STEPS) {
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
