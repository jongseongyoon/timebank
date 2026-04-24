export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// 기금 보증 현황: TC 미상환 채무 vs 기금 잔액
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const isCoordOrAdmin = session.user.roles.some(r => ['COORDINATOR', 'ADMIN'].includes(r))
  if (!isCoordOrAdmin) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  // 1. 전체 회원 TC 잔액 합산 (미래 청구 가능 채무)
  const memberBalances = await prisma.member.aggregate({
    _sum: { tcBalance: true, lifetimeEarned: true, lifetimeSpent: true },
    where: { status: { not: 'WITHDRAWN' } },
  })

  // 2. 장기저축 TC (isSavings=true 거래로 받은 TC) — 미래 돌봄 예약금
  const savingsTxs = await prisma.transaction.aggregate({
    _sum: { tcAmount: true },
    where: { isSavings: true, status: 'APPROVED' },
  })

  // 3. 활성 돌봄 패키지 현황
  const activePackages = await prisma.carePackage.findMany({
    where: { status: { in: ['ACTIVE', 'DRAFT'] } },
    select: {
      id: true, title: true, totalTcAmount: true, usedTcAmount: true,
      recipient: { select: { name: true, dong: true } },
      organization: { select: { name: true } },
      startDate: true, endDate: true, status: true,
    },
  })

  // 4. 기금 입출금 내역
  const fundTxs = await prisma.fundTransaction.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  const fundContributions = await prisma.fundTransaction.aggregate({
    _sum: { tcEquivalent: true, cashAmount: true },
    where: { fundTxType: 'CONTRIBUTION' },
  })
  const fundOutflows = await prisma.fundTransaction.aggregate({
    _sum: { tcEquivalent: true, cashAmount: true },
    where: { fundTxType: { in: ['EMERGENCY_SERVICE', 'VULNERABLE_ALLOC', 'EXTERNAL_PURCHASE', 'PRIVATE_PAYMENT'] } },
  })

  const totalFundTc = Number(fundContributions._sum.tcEquivalent ?? 0)
    - Number(fundOutflows._sum.tcEquivalent ?? 0)
  const totalFundCash = Number(fundContributions._sum.cashAmount ?? 0)
    - Number(fundOutflows._sum.cashAmount ?? 0)

  // 5. 총 미상환 TC 채무 (회원들의 TC 잔액 합 = 언젠가 서비스로 돌려줘야 할 양)
  const totalLiabilityTc = Number(memberBalances._sum.tcBalance ?? 0)
  const savingsTc = Number(savingsTxs._sum.tcAmount ?? 0)

  // 보증 비율: 기금 TC / 총 채무 TC
  const coverageRatio = totalLiabilityTc > 0
    ? Math.min(100, (totalFundTc / totalLiabilityTc) * 100)
    : 100

  // 활성 패키지 잔여 TC
  const activePackageTc = activePackages.reduce(
    (sum, p) => sum + (Number(p.totalTcAmount) - Number(p.usedTcAmount)), 0
  )

  return NextResponse.json({
    // TC 채무
    totalLiabilityTc,          // 전체 회원 TC 잔액 (미래 청구 예상)
    savingsTc,                  // 그 중 장기저축 TC
    activePackageTc,            // 진행 중 패키지 잔여 TC

    // 기금
    totalFundTc,               // 기금 TC 환산액
    totalFundCash,             // 기금 현금 잔액

    // 보증 비율
    coverageRatio: Math.round(coverageRatio * 10) / 10,

    // 상세
    activePackages,
    recentFundTxs: fundTxs,

    // 통계
    memberStats: {
      totalEarned: Number(memberBalances._sum.lifetimeEarned ?? 0),
      totalSpent: Number(memberBalances._sum.lifetimeSpent ?? 0),
    },
  })
}
