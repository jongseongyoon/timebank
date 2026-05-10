export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { awardWalkReward, GOAL_STEPS, type WalkRewardResult } from '@/lib/walk-service'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = await req.json()
  const steps: number =
    typeof body.steps === 'number' ? Math.max(0, Math.round(body.steps)) : 0

  // 클라이언트가 date를 보내면 사용 (pending_save 소급 처리용)
  // 허용 범위: 오늘 또는 어제까지 (최대 1일 소급)
  const serverToday = new Date().toISOString().slice(0, 10)
  let date = serverToday

  if (body.date && typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    const clientDate = new Date(body.date)
    const todayDate  = new Date(serverToday)
    const diffDays   = Math.floor(
      (todayDate.getTime() - clientDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    // 오늘(0) 또는 어제(1)까지만 허용
    if (diffDays >= 0 && diffDays <= 1) {
      date = body.date
    }
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
