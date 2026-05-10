/**
 * 공동체 순환 풀 (CirculationPool) 서비스
 *
 * 서비스 거래가 승인될 때마다 거래 금액의 10 %를 순환 풀에 적립합니다.
 * 순환 풀은 취약계층 TP 지원, 사회적처방 보조 등에 재분배됩니다.
 *
 * 사용법:
 *   import { addToCirculationPool } from '@/lib/circulation'
 *   const deposited = await addToCirculationPool(txAmount, trxClient?)
 */

import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

const CIRCULATION_RATE = 0.1   // 10 %
const POOL_ID = 'circulation-pool-001'

/**
 * 거래 금액의 10 %를 순환 풀에 적립합니다.
 *
 * @param tpAmount   서비스 거래 TP 금액
 * @param trx        prisma.$transaction 내부에서 호출 시 전달 (선택)
 * @returns          실제로 적립된 TP 양 (소수점 둘째 자리 반올림)
 */
export async function addToCirculationPool(
  tpAmount: number | { toNumber(): number },
  trx?: Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>
): Promise<number> {
  const amount = typeof tpAmount === 'number' ? tpAmount : tpAmount.toNumber()
  const deposit = Math.round(amount * CIRCULATION_RATE * 100) / 100
  if (deposit <= 0) return 0

  const client = (trx ?? prisma) as typeof prisma

  await (client as any).circulationPool.update({
    where: { id: POOL_ID },
    data: {
      tpBalance:        { increment: deposit },
      totalCirculated:  { increment: deposit },
    },
  })

  return deposit
}

/**
 * 순환 풀 현황을 조회합니다.
 */
export async function getCirculationPoolStatus() {
  return prisma.circulationPool.findUnique({ where: { id: POOL_ID } })
}
