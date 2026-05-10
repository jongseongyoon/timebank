/**
 * 지불준비금 (= 공동체 순환 풀) 서비스
 *
 * 최종 구조:
 *   서비스 거래 TP의 5% → 순환 풀(지불준비금)에 자동 적립
 *   용도: ① 민간시장 현금 대행 결제  ② 긴급 서비스 재원  ③ TP 신뢰 보장
 *
 * 지불준비율 = 순환 풀 TP / 전체 유통 TP × 100
 *   목표 5% | 경고 3% 미만 | 긴급 1% 미만
 */

import { prisma } from '@/lib/prisma'

const POOL_ID           = 'circulation-pool-001'
const CONFIG_ID         = 'reserve-config-001'
const CIRCULATION_RATE  = 0.05   // 거래 TP의 5%
const MONTHLY_PRIVATE_LIMIT = 20 // 개인당 월 민간대행 한도 (TP)

// ── 거래 완료 시 5% 자동 적립 ─────────────────────────────────────────────────

export async function addToReserveFund(
  tpAmount: number | { toNumber(): number },
  transactionId: string,
  trx?: any   // prisma.$transaction 내부에서 호출 시 전달
): Promise<number> {
  const amount     = typeof tpAmount === 'number' ? tpAmount : tpAmount.toNumber()
  const deposit    = Math.round(amount * CIRCULATION_RATE * 100) / 100
  if (deposit <= 0) return 0

  const client = trx ?? prisma

  // 현재 잔액 조회 (내역에 balanceAfter 기록용)
  const pool = await (trx
    ? client.circulationPool.findUnique({ where: { id: POOL_ID } })
    : prisma.circulationPool.findUnique({ where: { id: POOL_ID } }))
  const balanceAfter = Math.round(((pool ? Number(pool.tpBalance) : 0) + deposit) * 100) / 100

  await client.circulationPool.update({
    where: { id: POOL_ID },
    data: {
      tpBalance:       { increment: deposit },
      totalCirculated: { increment: deposit },
    },
  })

  await client.reserveFundTransaction.create({
    data: {
      txType:          'CIRCULATION_IN',
      tpAmount:        deposit,
      poolId:          POOL_ID,
      description:     `서비스 거래 환류 5% (거래 ${amount} TP의 5%) [${transactionId}]`,
      tpBalanceAfter:  balanceAfter,
      cashBalanceAfter: pool ? Number((pool as any).cashBalance ?? 0) : 0,
    },
  })

  return deposit
}

// ── 지불준비율 현황 계산 ──────────────────────────────────────────────────────

export async function getReserveRatioStatus() {
  const [totalTP, pool, config] = await Promise.all([
    prisma.member.aggregate({ _sum: { tpBalance: true } }),
    prisma.circulationPool.findUnique({ where: { id: POOL_ID } }),
    prisma.reserveRatioConfig.findUnique({ where: { id: CONFIG_ID } }),
  ])

  const circulatingTP = Number(totalTP._sum.tpBalance ?? 0)
  const reserveTP     = Number(pool?.tpBalance ?? 0)
  const reserveRatio  = circulatingTP > 0 ? (reserveTP / circulatingTP) * 100 : 0

  const target   = Number(config?.targetRatio   ?? 0.05) * 100  // 5%
  const warning  = Number(config?.warningRatio  ?? 0.03) * 100  // 3%
  const critical = Number(config?.criticalRatio ?? 0.01) * 100  // 1%

  return {
    circulatingTP,
    reserveTP,
    reserveRatio:   Math.round(reserveRatio * 100) / 100,
    targetRatio:    target,
    warningRatio:   warning,
    criticalRatio:  critical,
    isHealthy:      reserveRatio >= target,
    isWarning:      reserveRatio < warning,
    isCritical:     reserveRatio < critical,
    cashBalance:    Number((pool as any)?.cashBalance ?? 0),
  }
}

// ── 민간대행 결제 가능 여부 확인 ──────────────────────────────────────────────

export async function checkPrivateMarketAvailable(
  memberId: string,
  tpAmount: number
): Promise<{ available: boolean; reason?: string }> {
  // 1. 지불준비율 확인
  const status = await getReserveRatioStatus()
  if (status.isCritical) {
    return { available: false, reason: '지불준비금 긴급 부족 (1% 이하). 민간대행 일시 중단.' }
  }

  // 2. 회원 TP 잔액 확인
  const member = await prisma.member.findUnique({ where: { id: memberId } })
  if (!member || Number(member.tpBalance) < tpAmount) {
    return { available: false, reason: 'TP 잔액 부족' }
  }

  // 3. 월 한도 확인 (개인당 20 TP)
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const monthlyUsed = await prisma.reserveFundTransaction.aggregate({
    where: { memberId, txType: 'PRIVATE_MARKET_OUT', createdAt: { gte: monthStart } },
    _sum: { tpAmount: true },
  })
  const used = Number(monthlyUsed._sum.tpAmount ?? 0)

  if (used + tpAmount > MONTHLY_PRIVATE_LIMIT) {
    return { available: false, reason: `월 한도 초과 (사용 ${used} / 한도 ${MONTHLY_PRIVATE_LIMIT} TP)` }
  }

  return { available: true }
}

// ── 민간대행 결제 실행 ────────────────────────────────────────────────────────

export async function executePrivateMarketPayment(params: {
  memberId:    string
  tpAmount:    number
  vendorName:  string
  description: string
}): Promise<{ success: boolean; tpAmount?: number; cashAmount?: number; message?: string; reason?: string }> {
  const { memberId, tpAmount, vendorName, description } = params

  const check = await checkPrivateMarketAvailable(memberId, tpAmount)
  if (!check.available) return { success: false, reason: check.reason }

  // 최저시급 기준 현금 환산
  const MINIMUM_WAGE = Number(process.env.MINIMUM_WAGE_PER_HOUR ?? 10030)
  const cashAmount   = Math.round(tpAmount * MINIMUM_WAGE)

  const pool = await prisma.circulationPool.findUnique({ where: { id: POOL_ID } })
  const balanceAfter = Math.round(((pool ? Number(pool.tpBalance) : 0) - tpAmount) * 100) / 100

  await prisma.$transaction([
    // 회원 TP 차감
    prisma.member.update({
      where: { id: memberId },
      data: { tpBalance: { decrement: tpAmount }, lifetimeSpent: { increment: tpAmount } },
    }),
    // 순환 풀(지불준비금) TP 차감
    prisma.circulationPool.update({
      where: { id: POOL_ID },
      data: { tpBalance: { decrement: tpAmount }, totalDistributed: { increment: tpAmount } },
    }),
    // 지불준비금 지출 내역 기록
    prisma.reserveFundTransaction.create({
      data: {
        txType:          'PRIVATE_MARKET_OUT',
        tpAmount,
        cashAmount,
        memberId,
        poolId:          POOL_ID,
        description,
        externalVendor:  vendorName,
        tpBalanceAfter:  balanceAfter,
        cashBalanceAfter: pool ? Number((pool as any).cashBalance ?? 0) : 0,
      },
    }),
  ])

  return {
    success: true,
    tpAmount,
    cashAmount,
    message: `${vendorName}에 ${cashAmount.toLocaleString()}원 대행 결제 완료`,
  }
}
