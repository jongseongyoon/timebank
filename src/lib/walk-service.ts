/**
 * 만보기 TP 지급 서비스 (최종 단순 구조)
 *
 * 만보기 목표(10,000보) 달성 시 건강증진 기금에서 0.5 TP 전액 지급
 * ─ 순환 풀은 만보기 재원으로 사용하지 않음 (지불준비금 전담)
 */

import { prisma } from '@/lib/prisma'

const DAILY_GOAL       = 10000
const TP_PER_GOAL      = 0.5
const HEALTH_FUND_ID   = 'health-fund-001'

export const GOAL_STEPS    = DAILY_GOAL
export const TOTAL_REWARD  = TP_PER_GOAL

export interface WalkRewardResult {
  rewarded:          boolean
  tpTotal:           number
  tpFromFund:        number
  tpFromCirculation: number  // 최종 구조: 항상 0
  reason?:           string
}

// ── 만보기 TP 지급 (메인 함수) ─────────────────────────────────────────────────

export async function awardWalkReward(
  memberId: string,
  date: string,
  steps: number,
  coordinatorId: string
): Promise<WalkRewardResult> {
  // 1. 연간 발행 한도 확인
  const year   = new Date().getFullYear()
  const config = await prisma.walkRewardConfig.findUnique({ where: { year } })
  if (!config) {
    return { rewarded: false, tpTotal: 0, tpFromFund: 0, tpFromCirculation: 0, reason: '연간 설정 없음' }
  }
  if (Number(config.distributedThisYear) >= Number(config.annualTpLimit)) {
    return { rewarded: false, tpTotal: 0, tpFromFund: 0, tpFromCirculation: 0, reason: `${year}년 연간 발행 한도 초과` }
  }

  // 2. 건강증진 기금 잔액 확인
  const healthFund = await prisma.healthFund.findUnique({ where: { id: HEALTH_FUND_ID } })
  const fundBalance = Number(healthFund?.tpBalance ?? 0)
  if (fundBalance < TP_PER_GOAL) {
    return {
      rewarded: false, tpTotal: 0, tpFromFund: 0, tpFromCirculation: 0,
      reason: '건강증진 기금 잔액 부족. 관리자에게 기금 충전을 요청하세요.',
    }
  }

  const balanceAfterFund = Math.round((fundBalance - TP_PER_GOAL) * 100) / 100

  // 3. DB 트랜잭션 처리
  await prisma.$transaction(async (trx) => {
    // 회원 TP 적립
    await trx.member.update({
      where: { id: memberId },
      data: { tpBalance: { increment: TP_PER_GOAL }, lifetimeEarned: { increment: TP_PER_GOAL } },
    })

    // 건강증진 기금 차감
    await trx.healthFund.update({
      where: { id: HEALTH_FUND_ID },
      data: { tpBalance: { decrement: TP_PER_GOAL }, totalDistributed: { increment: TP_PER_GOAL } },
    })

    // 기금 내역 기록
    await trx.healthFundTransaction.create({
      data: {
        fundId:       HEALTH_FUND_ID,
        txType:       'WALK_REWARD',
        tpAmount:     TP_PER_GOAL,
        memberId,
        description:  `만보기 달성 지급 (${date}, ${steps.toLocaleString()}보) — 건강증진 기금 전액`,
        balanceAfter: balanceAfterFund,
      },
    })

    // WalkRecord 업데이트
    await trx.walkRecord.update({
      where: { memberId_date: { memberId, date } },
      data: {
        rewarded:          true,
        tpFromFund:        TP_PER_GOAL,
        tpFromCirculation: 0,
        tpSource:          'HEALTH_FUND',
        tpAwardedAt:       new Date(),
      },
    })

    // 연간 발행 총량 업데이트
    await trx.walkRewardConfig.update({
      where: { year },
      data: { distributedThisYear: { increment: TP_PER_GOAL } },
    })

    // 거래 원장 기록
    await trx.transaction.create({
      data: {
        txType:             'COMMUNITY_BONUS',
        receiverId:         memberId,
        tpAmount:           TP_PER_GOAL,
        durationMinutes:    0,
        baseRate:           TP_PER_GOAL,
        coordinatorId,
        verificationMethod: 'APP_CONFIRM',
        txHash:             `walk:${memberId}:${date}`,
        status:             'APPROVED',
        completedAt:        new Date(),
        note:               `만보기 달성 0.5 TP | 건강증진 기금 전액 지급 | ${steps.toLocaleString()}보`,
      },
    })
  })

  return {
    rewarded:          true,
    tpTotal:           TP_PER_GOAL,
    tpFromFund:        TP_PER_GOAL,
    tpFromCirculation: 0,
  }
}
