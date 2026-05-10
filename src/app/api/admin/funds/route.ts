/**
 * GET  /api/admin/funds  — 4개 기금 + 지불준비율 통합 현황 (관리자 전용)
 * POST /api/admin/funds  — 기금 충전 (관리자 전용)
 */
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getReserveRatioStatus } from '@/lib/reserve-fund'

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET() {
  const session = await auth()
  if (!session || !session.user.roles.includes('ADMIN')) {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  }

  const year = new Date().getFullYear()
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const [
    healthFund,
    circPool,
    spFund,
    walkConfig,
    adminConfig,
    reserveStatus,
    recentReserveTxs,
    privateMarketThisMonth,
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
    getReserveRatioStatus(),
    prisma.reserveFundTransaction.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { member: { select: { name: true, dong: true } } },
    }),
    prisma.reserveFundTransaction.aggregate({
      where: { txType: 'PRIVATE_MARKET_OUT', createdAt: { gte: monthStart } },
      _count: { id: true },
      _sum: { tpAmount: true },
    }),
    prisma.healthFundTransaction.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
    prisma.socialPrescriptionFundTx.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
    prisma.socialPrescription.count({ where: { status: 'ACTIVE' } }),
    prisma.socialPrescription.count({ where: { status: 'PENDING' } }),
  ])

  const walkIssued   = walkConfig ? Number(walkConfig.distributedThisYear) : 0
  const walkLimit    = walkConfig ? Number(walkConfig.annualTpLimit) : 100000
  const walkUsagePct = walkLimit > 0 ? (walkIssued / walkLimit) * 100 : 0

  const spDistributed = spFund ? Number(spFund.distributedThisYear) : 0
  const spAnnualLimit = spFund ? Number(spFund.annualLimit) : 200000
  const spUsagePct    = spAnnualLimit > 0 ? (spDistributed / spAnnualLimit) * 100 : 0

  const adminIssued   = adminConfig ? Number(adminConfig.issuedThisYear) : 0
  const adminLimit    = adminConfig ? Number(adminConfig.annualLimit) : 200000
  const adminUsagePct = adminLimit > 0 ? (adminIssued / adminLimit) * 100 : 0
  const warningPct    = adminConfig ? Number(adminConfig.warningThreshold) : 70
  const criticalPct   = adminConfig ? Number(adminConfig.criticalThreshold) : 90

  return NextResponse.json({
    summary: {
      healthFund: healthFund ? {
        tpBalance:        Number(healthFund.tpBalance),
        totalContributed: Number(healthFund.totalContributed),
        totalDistributed: Number(healthFund.totalDistributed),
      } : null,

      // 순환 풀 = 지불준비금
      reserveFund: circPool ? {
        tpBalance:         Number(circPool.tpBalance),
        cashBalance:       Number((circPool as any).cashBalance ?? 0),
        totalCirculated:   Number(circPool.totalCirculated),
        totalDistributed:  Number(circPool.totalDistributed),
        circulationRate:   Number((circPool as any).circulationRate ?? 0.05),
        // 지불준비율
        reserveRatio:      reserveStatus.reserveRatio,
        circulatingTP:     reserveStatus.circulatingTP,
        targetRatio:       reserveStatus.targetRatio,
        isHealthy:         reserveStatus.isHealthy,
        isWarning:         reserveStatus.isWarning,
        isCritical:        reserveStatus.isCritical,
        // 이번달 민간대행
        privateMarketCount:  privateMarketThisMonth._count.id,
        privateMarketTpUsed: Number(privateMarketThisMonth._sum.tpAmount ?? 0),
      } : null,

      spFund: spFund ? {
        tpBalance:           Number(spFund.tpBalance),
        totalContributed:    Number(spFund.totalContributed),
        distributedThisYear: spDistributed,
        annualLimit:         spAnnualLimit,
        usagePct:            spUsagePct,
        activePrescriptions,
        pendingPrescriptions,
      } : null,

      adminIssuance: {
        issuedThisYear:   adminIssued,
        annualLimit:      adminLimit,
        usagePct:         adminUsagePct,
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

    recentReserveTxs: recentReserveTxs.map(t => ({
      id:              t.id,
      createdAt:       t.createdAt,
      txType:          t.txType,
      tpAmount:        Number(t.tpAmount),
      cashAmount:      Number(t.cashAmount),
      description:     t.description,
      tpBalanceAfter:  Number(t.tpBalanceAfter),
      externalVendor:  t.externalVendor,
      memberName:      t.member?.name,
    })),

    recentHealthFundTxs: recentHealthFundTxs.map(t => ({
      id: t.id, createdAt: t.createdAt, txType: t.txType,
      tpAmount: Number(t.tpAmount), description: t.description,
      balanceAfter: Number(t.balanceAfter),
    })),

    recentSpFundTxs: recentSpFundTxs.map(t => ({
      id: t.id, createdAt: t.createdAt, txType: t.txType,
      tpAmount: Number(t.tpAmount), description: t.description,
      balanceAfter: Number(t.balanceAfter),
    })),
  })
}

// ── POST: 기금 충전 ───────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || !session.user.roles.includes('ADMIN')) {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { fundType, amount, source, note } = body

    if (!fundType || !amount || Number(amount) <= 0) {
      return NextResponse.json({ error: 'fundType·amount 필수' }, { status: 400 })
    }

    const tpAmount   = Number(amount)
    const sourceNote = source ? `[${source}] ` : ''
    const description = `${sourceNote}${note ?? '관리자 충전'}`

    if (fundType === 'HEALTH_FUND') {
      const fund = await prisma.healthFund.findUnique({ where: { id: 'health-fund-001' } })
      const balanceAfter = Math.round(((fund ? Number(fund.tpBalance) : 0) + tpAmount) * 100) / 100
      await prisma.$transaction([
        prisma.healthFund.update({
          where: { id: 'health-fund-001' },
          data: { tpBalance: { increment: tpAmount }, totalContributed: { increment: tpAmount } },
        }),
        prisma.healthFundTransaction.create({
          data: {
            fundId: 'health-fund-001', txType: 'CONTRIBUTION',
            tpAmount, memberId: session.user.id,
            description, balanceAfter,
          },
        }),
      ])
      return NextResponse.json({ success: true, fundType, tpAmount, balanceAfter })
    }

    if (fundType === 'SP_FUND') {
      await prisma.socialPrescriptionFund.update({
        where: { id: 'sp-fund-001' },
        data: { tpBalance: { increment: tpAmount }, totalContributed: { increment: tpAmount } },
      })
      const updatedFund = await prisma.socialPrescriptionFund.findUnique({ where: { id: 'sp-fund-001' } })
      const balanceAfter = Number(updatedFund?.tpBalance ?? 0)
      await prisma.socialPrescriptionFundTx.create({
        data: {
          fundId: 'sp-fund-001', txType: 'CONTRIBUTION',
          tpAmount, memberId: session.user.id,
          description, balanceAfter,
        },
      })
      return NextResponse.json({ success: true, fundType, tpAmount, balanceAfter })
    }

    if (fundType === 'RESERVE_FUND') {
      const pool = await prisma.circulationPool.findUnique({ where: { id: 'circulation-pool-001' } })
      const balanceAfter = Math.round(((pool ? Number(pool.tpBalance) : 0) + tpAmount) * 100) / 100
      await prisma.$transaction([
        prisma.circulationPool.update({
          where: { id: 'circulation-pool-001' },
          data: { tpBalance: { increment: tpAmount }, totalCirculated: { increment: tpAmount } },
        }),
        prisma.reserveFundTransaction.create({
          data: {
            poolId: 'circulation-pool-001', txType: 'CASH_CONTRIBUTION',
            tpAmount, memberId: session.user.id,
            description, tpBalanceAfter: balanceAfter,
          },
        }),
      ])
      return NextResponse.json({ success: true, fundType, tpAmount, balanceAfter })
    }

    return NextResponse.json({ error: '유효하지 않은 fundType' }, { status: 400 })
  } catch (err: any) {
    console.error('[POST /api/admin/funds]', err)
    return NextResponse.json({ error: err.message ?? '서버 오류' }, { status: 500 })
  }
}
