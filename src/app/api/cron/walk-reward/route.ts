/**
 * GET /api/cron/walk-reward
 * Vercel Cron Job — 매일 한국시간 23:59 (UTC 14:59) 자동 실행
 *
 * 오늘 WalkRecord 중 steps >= 10000 이고 rewarded = false 인 회원에게
 * 건강증진 기금에서 0.5 TP 일괄 지급
 */
export const dynamic = 'force-dynamic'
export const maxDuration = 60  // 최대 60초 (Vercel Pro 플랜 이상)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { awardWalkReward } from '@/lib/walk-service'

export async function GET(req: NextRequest) {
  // ── Vercel Cron 인증 ───────────────────────────────────────────────────────
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  // CRON_SECRET 환경변수가 설정된 경우에만 검증 (미설정 시 로컬 테스트 허용)
  if (cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: '인증 실패' }, { status: 401 })
    }
  }

  const today = new Date().toISOString().slice(0, 10)
  const startedAt = Date.now()

  // ── 1. 오늘 미지급 달성자 조회 ──────────────────────────────────────────────
  const targets = await prisma.walkRecord.findMany({
    where: {
      date:     today,
      steps:    { gte: 10000 },
      rewarded: false,
    },
    select: { memberId: true, steps: true },
  })

  console.log(`[cron/walk-reward] ${today} 미지급 달성자: ${targets.length}명`)

  if (targets.length === 0) {
    return NextResponse.json({
      ok:      true,
      date:    today,
      total:   0,
      success: 0,
      failed:  0,
      skipped: 0,
      elapsed: `${Date.now() - startedAt}ms`,
      message: '지급 대상 없음',
    })
  }

  // ── 2. 코디네이터(관리자) ID 조회 (TP 지급 원장 기록용) ─────────────────────
  const admin = await prisma.member.findFirst({
    where:  { roles: { has: 'ADMIN' } },
    select: { id: true },
  })

  // ── 3. 회원별 순차 지급 ────────────────────────────────────────────────────
  let success = 0
  let failed  = 0
  let skipped = 0
  const errors: { memberId: string; reason: string }[] = []

  for (const { memberId, steps } of targets) {
    try {
      const coordinatorId = admin?.id ?? memberId
      const result = await awardWalkReward(memberId, today, steps, coordinatorId)

      if (result.rewarded) {
        success++
      } else {
        // 기금 부족 / 한도 초과 등 → 더 이상 진행 불가
        skipped++
        errors.push({ memberId, reason: result.reason ?? '알 수 없음' })
        console.warn(`[cron/walk-reward] SKIP ${memberId}: ${result.reason}`)

        // 기금 부족이면 나머지도 모두 실패하므로 중단
        if (result.reason?.includes('기금 잔액') || result.reason?.includes('한도')) break
      }
    } catch (err: any) {
      failed++
      errors.push({ memberId, reason: err.message ?? '오류' })
      console.error(`[cron/walk-reward] ERROR ${memberId}:`, err)
    }
  }

  const elapsed = `${Date.now() - startedAt}ms`
  console.log(`[cron/walk-reward] 완료 — 성공 ${success}, 건너뜀 ${skipped}, 오류 ${failed} (${elapsed})`)

  return NextResponse.json({
    ok:      true,
    date:    today,
    total:   targets.length,
    success,
    failed,
    skipped,
    elapsed,
    errors:  errors.length > 0 ? errors : undefined,
  })
}
