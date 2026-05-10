/**
 * 만보기 TP 지급 서비스 (3단계)
 *
 * 만보기 목표(10,000보) 달성 시 0.5 TP 지급:
 *   - 건강증진 기금(HealthFund)  → 0.3 TP
 *   - 공동체 순환 풀(CirculationPool) → 0.2 TP
 *
 * 각 기금 잔액이 부족하면 잔액만큼 지급하고 나머지는 상대 기금에서 보충합니다.
 * 두 기금 합산으로도 0.5 TP 마련이 불가능하면 지급하지 않습니다.
 */

import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

const GOAL_STEPS   = 10000
const TOTAL_REWARD = 0.5          // 목표 달성 시 지급 TP
const FUND_SHARE   = 0.3          // 건강증진 기금 분담
const CIRC_SHARE   = 0.2          // 순환 풀 분담

const HEALTH_FUND_ID = 'health-fund-001'
const CIRC_POOL_ID   = 'circulation-pool-001'

export interface WalkRewardResult {
  rewarded:          boolean
  tpTotal:           number
  tpFromFund:        number
  tpFromCirculation: number
  reason?:           string        // 미지급 사유
}

/**
 * 만보기 목표를 처음 달성한 시점에 호출합니다.
 * DB 트랜잭션 내부에서 atomic하게 처리됩니다.
 *
 * @param memberId   보상받을 회원 ID
 * @param date       달성 날짜 (YYYY-MM-DD)
 * @param steps      달성 걸음 수
 * @param coordinatorId 트랜잭션 기록용 코디네이터 ID
 */
export async function awardWalkReward(
  memberId: string,
  date: string,
  steps: number,
  coordinatorId: string
): Promise<WalkRewardResult> {
  // 기금 잔액 확인
  const [healthFund, circPool] = await Promise.all([
    prisma.healthFund.findUnique({ where: { id: HEALTH_FUND_ID } }),
    prisma.circulationPool.findUnique({ where: { id: CIRC_POOL_ID } }),
  ])

  const fundBalance  = healthFund  ? Number(healthFund.tpBalance)  : 0
  const circBalance  = circPool    ? Number(circPool.tpBalance)     : 0
  const totalAvail   = fundBalance + circBalance

  if (totalAvail < TOTAL_REWARD) {
    // 두 기금 합산으로도 부족 — 지급 불가
    return {
      rewarded:          false,
      tpTotal:           0,
      tpFromFund:        0,
      tpFromCirculation: 0,
      reason:            '기금 잔액 부족',
    }
  }

  // 분담 계산: 기금 우선, 부족분은 순환 풀에서 보충
  let fromFund = Math.min(FUND_SHARE, fundBalance)
  let fromCirc = Math.min(CIRC_SHARE, circBalance)

  const shortfall = TOTAL_REWARD - fromFund - fromCirc
  if (shortfall > 0.001) {
    // 한쪽이 부족할 때 다른 쪽에서 추가 보충
    if (fundBalance > FUND_SHARE) {
      fromFund = Math.min(fundBalance, fromFund + shortfall)
    } else {
      fromCirc = Math.min(circBalance, fromCirc + shortfall)
    }
  }

  // 소수점 2자리 반올림
  fromFund = Math.round(fromFund * 100) / 100
  fromCirc = Math.round(fromCirc * 100) / 100
  const tpTotal = Math.round((fromFund + fromCirc) * 100) / 100

  const txHash = `walk:${memberId}:${date}`

  const balanceAfterFund = Math.round((fundBalance - fromFund) * 100) / 100

  await prisma.$transaction(async (trx) => {
    // 1. 건강증진 기금 차감
    if (fromFund > 0) {
      await trx.healthFund.update({
        where: { id: HEALTH_FUND_ID },
        data: {
          tpBalance:        { decrement: fromFund },
          totalDistributed: { increment: fromFund },
        },
      })
      await trx.healthFundTransaction.create({
        data: {
          fundId:       HEALTH_FUND_ID,
          txType:       'WALK_REWARD',
          tpAmount:     fromFund,
          memberId,
          description:  `만보기 달성 지급 (${date}, ${steps.toLocaleString()}보)`,
          balanceAfter: balanceAfterFund,
        },
      })
    }

    // 2. 순환 풀 차감
    if (fromCirc > 0) {
      await trx.circulationPool.update({
        where: { id: CIRC_POOL_ID },
        data: {
          tpBalance:        { decrement: fromCirc },
          totalDistributed: { increment: fromCirc },
        },
      })
    }

    // 3. 회원 TP 적립
    await trx.member.update({
      where: { id: memberId },
      data: {
        tpBalance:     { increment: tpTotal },
        lifetimeEarned:{ increment: tpTotal },
      },
    })

    // 4. 거래 기록
    await trx.transaction.create({
      data: {
        txType:            'COMMUNITY_BONUS',
        receiverId:        memberId,
        durationMinutes:   0,
        tpAmount:          tpTotal,
        baseRate:          tpTotal,
        coordinatorId,
        verificationMethod: 'APP_CONFIRM',
        txHash,
        status:            'APPROVED',
        completedAt:       new Date(),
        note:              `만보기 달성 보상 (${date}, ${steps.toLocaleString()}보) – 기금 ${fromFund} TP + 순환풀 ${fromCirc} TP`,
      },
    })

    // 5. WalkRecord 업데이트
    await trx.walkRecord.update({
      where: { memberId_date: { memberId, date } },
      data: {
        rewarded:          true,
        tpFromFund:        fromFund,
        tpFromCirculation: fromCirc,
        tpAwardedAt:       new Date(),
      },
    })
  })

  return {
    rewarded:          true,
    tpTotal,
    tpFromFund:        fromFund,
    tpFromCirculation: fromCirc,
  }
}

export { GOAL_STEPS, TOTAL_REWARD }
