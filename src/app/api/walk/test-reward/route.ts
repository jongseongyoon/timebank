/**
 * POST /api/walk/test-reward
 * 개발/진단용 강제 TP 지급 테스트
 * — 오늘 WalkRecord를 10,000보로 덮어쓰고 rewarded=false 로 초기화한 뒤 TP 지급을 실행합니다.
 * — 이미 오늘 지급된 경우 force=true 를 body에 포함해야 재지급합니다.
 */
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { awardWalkReward } from '@/lib/walk-service'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body  = await req.json().catch(() => ({}))
  const force = body.force === true   // 이미 지급된 경우 재지급 여부
  const steps = typeof body.steps === 'number' ? body.steps : 10000

  const memberId = session.user.id
  const today    = new Date().toISOString().slice(0, 10)

  // 기존 레코드 확인
  const existing = await prisma.walkRecord.findUnique({
    where: { memberId_date: { memberId, date: today } },
  })

  if (existing?.rewarded && !force) {
    return NextResponse.json({
      success: false,
      reason:  '오늘 이미 TP가 지급되었습니다. 재지급하려면 force:true 를 함께 보내세요.',
      todayRecord: {
        steps:      existing.steps,
        rewarded:   existing.rewarded,
        tpFromFund: Number(existing.tpFromFund ?? 0),
      },
    })
  }

  // 1) WalkRecord 강제 세팅 (rewarded 초기화 포함)
  await prisma.walkRecord.upsert({
    where:  { memberId_date: { memberId, date: today } },
    update: { steps, rewarded: false, tpFromFund: 0, tpFromCirculation: 0 },
    create: { memberId, date: today, steps, rewarded: false },
  })

  // 2) TP 지급
  const admin = await prisma.member.findFirst({
    where:  { roles: { has: 'ADMIN' } },
    select: { id: true },
  })
  const coordinatorId = admin?.id ?? memberId

  const result = await awardWalkReward(memberId, today, steps, coordinatorId)

  // 3) 지급 후 최신 회원 TP 잔액 조회
  const member = await prisma.member.findUnique({
    where:  { id: memberId },
    select: { tpBalance: true },
  })

  return NextResponse.json({
    success:       result.rewarded,
    reason:        result.reason ?? null,
    steps,
    tpTotal:       result.tpTotal,
    tpFromFund:    result.tpFromFund,
    tpBalance:     Number(member?.tpBalance ?? 0),
    message: result.rewarded
      ? `✅ ${result.tpTotal} TP 지급 완료 (건강증진 기금)`
      : `❌ TP 미지급: ${result.reason}`,
  })
}
