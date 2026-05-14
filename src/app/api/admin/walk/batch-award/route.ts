/**
 * POST /api/admin/walk/batch-award
 * 미지급 만보기 TP 일괄 처리 (관리자 전용)
 *
 * steps >= 10000 이고 rewarded = false 인 WalkRecord 전체에 TP 지급
 */
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { awardWalkReward } from '@/lib/walk-service'

export async function POST(_req: NextRequest) {
  const session = await auth()
  if (!session?.user.roles.includes('ADMIN')) {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  }

  const startedAt = Date.now()

  // 미지급 달성 기록 전체 조회 (날짜 무제한 — 소급 처리)
  const targets = await prisma.walkRecord.findMany({
    where:  { steps: { gte: 10000 }, rewarded: false },
    orderBy: { date: 'asc' },
    select: { memberId: true, steps: true, date: true },
  })

  if (targets.length === 0) {
    return NextResponse.json({
      ok:      true,
      total:   0,
      success: 0,
      failed:  0,
      skipped: 0,
      elapsed: `${Date.now() - startedAt}ms`,
      message: '미지급 건 없음',
    })
  }

  // 코디네이터(관리자) ID
  const admin = await prisma.member.findFirst({
    where:  { roles: { has: 'ADMIN' } },
    select: { id: true },
  })
  const coordinatorId = admin?.id ?? session.user.id

  let success = 0
  let failed  = 0
  let skipped = 0
  const detail: { memberId: string; date: string; steps: number; ok: boolean; reason?: string }[] = []

  for (const { memberId, steps, date } of targets) {
    try {
      const result = await awardWalkReward(memberId, date, steps, coordinatorId)
      if (result.rewarded) {
        success++
        detail.push({ memberId, date, steps, ok: true })
      } else {
        skipped++
        detail.push({ memberId, date, steps, ok: false, reason: result.reason })
        // 기금 부족이면 남은 것도 모두 실패 → 중단
        if (result.reason?.includes('기금') || result.reason?.includes('한도')) break
      }
    } catch (err: any) {
      failed++
      detail.push({ memberId, date, steps, ok: false, reason: err.message })
    }
  }

  return NextResponse.json({
    ok:      true,
    total:   targets.length,
    success,
    failed,
    skipped,
    elapsed: `${Date.now() - startedAt}ms`,
    detail,
  })
}
