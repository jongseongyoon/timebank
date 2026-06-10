/**
 * 만보기 TP 지급 서비스
 *
 * 핵심 보안 설계:
 *  - 연간 한도·기금 잔액 확인을 $transaction 안으로 이동 → 비원자적 체크 제거
 *  - walkRecord.updateMany(where: { rewarded: false }) 로 원자적 클레임
 *    → 동시 요청이 몇 개 와도 정확히 1건만 지급됨 (Optimistic Lock)
 */

import { revalidateTag } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { kstYear } from '@/lib/kst'

const DAILY_GOAL     = 10000
const TP_PER_GOAL    = 0.5
const HEALTH_FUND_ID = 'health-fund-001'

export const GOAL_STEPS   = DAILY_GOAL
export const TOTAL_REWARD = TP_PER_GOAL

export interface WalkRewardResult {
  rewarded:          boolean
  tpTotal:           number
  tpFromFund:        number
  tpFromCirculation: number
  reason?:           string
}

// ── 알려진 실패 코드 ──────────────────────────────────────────────────────────
const KNOWN_CODES = ['NO_CONFIG', 'ANNUAL_LIMIT', 'INSUFFICIENT_FUND', 'ALREADY_REWARDED'] as const
type KnownCode = typeof KNOWN_CODES[number]

function fail(code: KnownCode, message: string): never {
  const e = new Error(message) as Error & { code: KnownCode }
  e.code = code
  throw e
}

// ── 만보기 TP 지급 (메인 함수) ─────────────────────────────────────────────────

export async function awardWalkReward(
  memberId:      string,
  date:          string,
  steps:         number,
  coordinatorId: string,
): Promise<WalkRewardResult> {
  const year = kstYear()

  try {
    await prisma.$transaction(async (trx) => {

      // ① 연간 발행 한도 확인
      //    설정이 없으면 기본값(100,000 TP)으로 자동 생성 + 서버 로그 경고
      //    → 신년 seed 누락 시 조용히 실패하던 버그 해결
      let config = await trx.walkRewardConfig.findUnique({ where: { year } })
      if (!config) {
        console.error(
          `[walk-service] ⚠️  WalkRewardConfig(year=${year}) 없음 — 기본값(100,000 TP)으로 자동 생성. ` +
          `관리자가 Prisma Studio 또는 시드 스크립트로 값을 검토·조정하세요.`
        )
        config = await trx.walkRewardConfig.create({
          data: { year, annualTpLimit: 100_000, distributedThisYear: 0 },
        })
      }
      if (Number(config.distributedThisYear) >= Number(config.annualTpLimit)) {
        fail('ANNUAL_LIMIT', `${year}년 연간 발행 한도 초과`)
      }

      // ② 기금 잔액 확인 (트랜잭션 내 → 직렬화 보장)
      const healthFund = await trx.healthFund.findUnique({ where: { id: HEALTH_FUND_ID } })
      if (!healthFund) {
        console.error(`[walk-service] ⚠️  HealthFund(id=${HEALTH_FUND_ID}) 레코드 없음 — seed 재실행 필요`)
        fail('INSUFFICIENT_FUND', '건강증진 기금이 설정되지 않았습니다. 관리자에게 문의하세요.')
      }
      const fundBalance = Number(healthFund.tpBalance)
      if (fundBalance < TP_PER_GOAL) {
        fail('INSUFFICIENT_FUND', '건강증진 기금 잔액 부족. 관리자에게 기금 충전을 요청하세요.')
      }

      // ③ WalkRecord 원자적 클레임
      //    rewarded = false 인 행만 업데이트 → count = 0 이면 이미 지급됨
      //    Postgres 행 잠금 덕분에 동시 트랜잭션 중 정확히 1건만 count = 1
      const claimed = await trx.walkRecord.updateMany({
        where: { memberId, date, rewarded: false },
        data: {
          rewarded:          true,
          tpFromFund:        TP_PER_GOAL,
          tpFromCirculation: 0,
          tpSource:          'HEALTH_FUND',
          tpAwardedAt:       new Date(),
        },
      })
      if (claimed.count === 0) {
        fail('ALREADY_REWARDED', '이미 지급됨')
      }

      const balanceAfterFund = Math.round((fundBalance - TP_PER_GOAL) * 100) / 100

      // ④ 회원 TP 적립
      await trx.member.update({
        where: { id: memberId },
        data: {
          tpBalance:     { increment: TP_PER_GOAL },
          lifetimeEarned:{ increment: TP_PER_GOAL },
        },
      })

      // ⑤ 건강증진 기금 차감
      await trx.healthFund.update({
        where: { id: HEALTH_FUND_ID },
        data: {
          tpBalance:        { decrement: TP_PER_GOAL },
          totalDistributed: { increment: TP_PER_GOAL },
        },
      })

      // ⑥ 기금 내역 기록
      await trx.healthFundTransaction.create({
        data: {
          fundId:      HEALTH_FUND_ID,
          txType:      'WALK_REWARD',
          tpAmount:    TP_PER_GOAL,
          memberId,
          description: `만보기 달성 지급 (${date}, ${steps.toLocaleString()}보) — 건강증진 기금 전액`,
          balanceAfter: balanceAfterFund,
        },
      })

      // ⑦ 연간 발행 총량 업데이트
      await trx.walkRewardConfig.update({
        where: { year },
        data:  { distributedThisYear: { increment: TP_PER_GOAL } },
      })

      // ⑧ 거래 원장 기록 — txHash가 @unique이므로 upsert로 멱등 처리
      //    (과거 지급 이력이 남은 상태에서 재지급 시도 시 P2002 충돌로
      //     트랜잭션 전체가 롤백되어 영구 미지급되던 버그 방지)
      await trx.transaction.upsert({
        where: { txHash: `walk:${memberId}:${date}` },
        update: {},   // 이미 있으면 그대로 둠
        create: {
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

    // 기금 잔액 바뀌었으므로 캐시 무효화
    revalidateTag('fund-status')

    return { rewarded: true, tpTotal: TP_PER_GOAL, tpFromFund: TP_PER_GOAL, tpFromCirculation: 0 }

  } catch (e: any) {
    // 알려진 실패 → 예외가 아닌 결과로 반환
    if (KNOWN_CODES.includes(e.code)) {
      return { rewarded: false, tpTotal: 0, tpFromFund: 0, tpFromCirculation: 0, reason: e.message }
    }
    throw e   // 예상치 못한 DB 오류는 위로 전파
  }
}
