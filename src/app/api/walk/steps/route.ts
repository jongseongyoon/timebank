export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const GOAL = 10000
const REWARD_TC = 0.5

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = await req.json()
  const steps: number =
    typeof body.steps === 'number' ? Math.max(0, Math.round(body.steps)) : 0

  const memberId = session.user.id
  const today = new Date().toISOString().slice(0, 10)

  // 기존 기록 조회 (걸음 수는 감소하지 않음)
  const existing = await prisma.walkRecord.findUnique({
    where: { memberId_date: { memberId, date: today } },
  })

  const newSteps = Math.max(existing?.steps ?? 0, steps)

  const record = await prisma.walkRecord.upsert({
    where: { memberId_date: { memberId, date: today } },
    update: { steps: newSteps },
    create: { memberId, date: today, steps: newSteps },
  })

  // 목표 달성 + 미지급 → TC 보상
  let rewardedNow = false

  if (!record.rewarded && newSteps >= GOAL) {
    // 코디네이터 = 첫 번째 ADMIN or 본인
    const admin = await prisma.member.findFirst({
      where: { roles: { has: 'ADMIN' } },
      select: { id: true },
    })
    const coordinatorId = admin?.id ?? memberId
    const txHash = `walk:${memberId}:${today}`

    await prisma.$transaction([
      prisma.member.update({
        where: { id: memberId },
        data: {
          tcBalance: { increment: REWARD_TC },
          lifetimeEarned: { increment: REWARD_TC },
        },
      }),
      prisma.transaction.create({
        data: {
          txType: 'COMMUNITY_BONUS',
          receiverId: memberId,
          durationMinutes: 0,
          tcAmount: REWARD_TC,
          baseRate: REWARD_TC,
          coordinatorId,
          verificationMethod: 'APP_CONFIRM',
          txHash,
          status: 'APPROVED',
          completedAt: new Date(),
          note: `만보기 달성 보상 (${today}, ${newSteps.toLocaleString()}보)`,
        },
      }),
      prisma.walkRecord.update({
        where: { memberId_date: { memberId, date: today } },
        data: { rewarded: true },
      }),
    ])

    rewardedNow = true
  }

  return NextResponse.json({
    steps: newSteps,
    rewarded: record.rewarded || rewardedNow,
    rewardedNow,
    goal: GOAL,
  })
}
