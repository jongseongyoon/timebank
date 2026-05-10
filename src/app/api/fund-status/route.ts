/**
 * GET /api/fund-status
 * 모든 기금 공개 현황 (로그인 불필요 — 투명성 공개용)
 *
 * 관리자 발행 누적액 등 민감 정보는 표시하지 않고
 * 시민이 알아야 할 공익적 정보만 제공합니다.
 */
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getReserveRatioStatus } from '@/lib/reserve-fund'

export async function GET() {
  try {
    const year = new Date().getFullYear()

    const [healthFund, circPool, spFund, walkConfig, totalMembers, totalTransactions, reserveStatus] = await Promise.all([
      prisma.healthFund.findUnique({ where: { id: 'health-fund-001' } }),
      prisma.circulationPool.findUnique({ where: { id: 'circulation-pool-001' } }),
      prisma.socialPrescriptionFund.findUnique({ where: { id: 'sp-fund-001' } }),
      prisma.walkRewardConfig.findUnique({ where: { year } }),
      prisma.member.count({ where: { roles: { isEmpty: false } } }),
      prisma.transaction.count({ where: { status: 'APPROVED' } }),
      getReserveRatioStatus(),
    ])

    return NextResponse.json({
      updatedAt: new Date().toISOString(),
      year,
      totalMembers,
      totalTransactions,
      healthFund: healthFund ? {
        tpBalance:        Number(healthFund.tpBalance),
        totalContributed: Number(healthFund.totalContributed),
        totalDistributed: Number(healthFund.totalDistributed),
      } : null,
      // 지불준비금 (순환 풀)
      reserveFund: circPool ? {
        tpBalance:       Number(circPool.tpBalance),
        totalCirculated: Number(circPool.totalCirculated),
        // 지불준비율
        reserveRatio:    reserveStatus.reserveRatio,
        circulatingTP:   reserveStatus.circulatingTP,
        targetRatio:     reserveStatus.targetRatio,
        isHealthy:       reserveStatus.isHealthy,
        isWarning:       reserveStatus.isWarning,
        isCritical:      reserveStatus.isCritical,
        // 민간대행 가능 여부 (지불준비율 1% 이상이면 가능)
        privateMarketAvailable: !reserveStatus.isCritical,
      } : null,
      socialPrescriptionFund: spFund ? {
        tpBalance:           Number(spFund.tpBalance),
        totalContributed:    Number(spFund.totalContributed),
        distributedThisYear: Number(spFund.distributedThisYear),
        annualLimit:         Number(spFund.annualLimit),
      } : null,
      walkReward: walkConfig ? {
        tpPerGoal:           Number(walkConfig.tpPerGoal),
        distributedThisYear: Number(walkConfig.distributedThisYear),
        annualTpLimit:       Number(walkConfig.annualTpLimit),
      } : null,
    })
  } catch (err: any) {
    console.error('[GET /api/fund-status]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
