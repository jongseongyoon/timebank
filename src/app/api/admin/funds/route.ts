/**
 * GET /api/admin/funds
 * 4개 기금 통합 현황 + 관리자 마이너스 발행 현황 (관리자 전용)
 */
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session || !session.user.roles.includes('ADMIN')) {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  }

  const year = new Date().getFullYear()

  const [
    healthFund,
    circPool,
    spFund,
    walkConfig,
    adminConfig,
    recentAdminIssuances,
    recentHealthFundTxs,
    recentSpFundTxs,
    activePrescriptions,
    pendingPrescriptions,
  ] = await Promise.all([
    prisma.healthFund.findUnique({ where: { id: 'health-fund-001' } }),
    prisma.circulationPool.findUnique({ where: { id: 'circulation-pool-001' } }),
    prisma.socialPrescriptionFund.findUnique({ where: { id: 'sp-fund-001' } }),
    prisma.walkRewardConfig.findUnique({ where: { year } }),
    prisma.adminIssuanceConfig.findUnique({ where: { year } }),
    prisma.adminTpIssuance.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { receiver: { select: { name: true, dong: true } } },
    }),
    prisma.healthFundTransaction.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.socialPrescriptionFundTx.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.socialPrescription.count({ where: { status: 'ACTIVE' } }),
    prisma.socialPrescription.count({ where: { status: 'PENDING' } }),
  ])

  // 경고 임계치 계산
  const adminIssued    = adminConfig ? Number(adminConfig.issuedThisYear) : 0
  const adminLimit     = adminConfig ? Number(adminConfig.annualLimit) : 200000
  const adminUsagePct  = adminLimit > 0 ? (adminIssued / adminLimit) * 100 : 0
  const warningPct     = adminConfig ? Number(adminConfig.warningThreshold) : 70
  const criticalPct    = adminConfig ? Number(adminConfig.criticalThreshold) : 90

  const walkIssued     = walkConfig ? Number(walkConfig.distributedThisYear) : 0
  const walkLimit      = walkConfig ? Number(walkConfig.annualTpLimit) : 100000
  const walkUsagePct   = walkLimit > 0 ? (walkIssued / walkLimit) * 100 : 0

  const spBalance      = spFund ? Number(spFund.tpBalance) : 0
  const spDistributed  = spFund ? Number(spFund.distributedThisYear) : 0
  const spAnnualLimit  = spFund ? Number(spFund.annualLimit) : 200000
  const spUsagePct     = spAnnualLimit > 0 ? (spDistributed / spAnnualLimit) * 100 : 0

  return NextResponse.json({
    summary: {
      healthFund: healthFund ? {
        tpBalance:        Number(healthFund.tpBalance),
        totalContributed: Number(healthFund.totalContributed),
        totalDistributed: Number(healthFund.totalDistributed),
      } : null,
      circulationPool: circPool ? {
        tpBalance:        Number(circPool.tpBalance),
        totalCirculated:  Number(circPool.totalCirculated),
        totalDistributed: Number(circPool.totalDistributed),
      } : null,
      spFund: spFund ? {
        tpBalance:          spBalance,
        totalContributed:   Number(spFund.totalContributed),
        totalDistributed:   Number(spFund.totalDistributed),
        distributedThisYear: spDistributed,
        annualLimit:        spAnnualLimit,
        usagePct:           spUsagePct,
        activePrescriptions,
        pendingPrescriptions,
      } : null,
      adminIssuance: {
        issuedThisYear: adminIssued,
        annualLimit:    adminLimit,
        usagePct:       adminUsagePct,
        warningThreshold: warningPct,
        criticalThreshold: criticalPct,
        isWarning:  adminUsagePct >= warningPct,
        isCritical: adminUsagePct >= criticalPct,
      },
      walkConfig: walkConfig ? {
        distributedThisYear: walkIssued,
        annualTpLimit:       walkLimit,
        usagePct:            walkUsagePct,
        tpPerGoal:           Number(walkConfig.tpPerGoal),
      } : null,
    },
    recentAdminIssuances: recentAdminIssuances.map(i => ({
      id:              i.id,
      createdAt:       i.createdAt,
      issuanceType:    i.issuanceType,
      tpAmount:        Number(i.tpAmount),
      cumulativeIssued: Number(i.cumulativeIssued),
      adminBalance:    Number(i.adminBalance),
      description:     i.description,
      receiverName:    i.receiver?.name,
      receiverDong:    i.receiver?.dong,
    })),
    recentHealthFundTxs: recentHealthFundTxs.map(t => ({
      id:          t.id,
      createdAt:   t.createdAt,
      txType:      t.txType,
      tpAmount:    Number(t.tpAmount),
      description: t.description,
      balanceAfter: Number(t.balanceAfter),
    })),
    recentSpFundTxs: recentSpFundTxs.map(t => ({
      id:          t.id,
      createdAt:   t.createdAt,
      txType:      t.txType,
      tpAmount:    Number(t.tpAmount),
      description: t.description,
      balanceAfter: Number(t.balanceAfter),
    })),
  })
}
