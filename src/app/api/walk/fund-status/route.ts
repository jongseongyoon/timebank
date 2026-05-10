/**
 * GET /api/walk/fund-status
 * 만보기 재원(건강증진기금 + 순환풀) 현황 반환 (로그인 필요)
 */
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const year = new Date().getFullYear()

  const [healthFund, circPool, walkConfig] = await Promise.all([
    prisma.healthFund.findUnique({ where: { id: 'health-fund-001' } }),
    prisma.circulationPool.findUnique({ where: { id: 'circulation-pool-001' } }),
    prisma.walkRewardConfig.findUnique({ where: { year } }),
  ])

  return NextResponse.json({
    healthFund: healthFund
      ? {
          tpBalance:        Number(healthFund.tpBalance),
          totalDistributed: Number(healthFund.totalDistributed),
        }
      : null,
    circulationPool: circPool
      ? {
          tpBalance:       Number(circPool.tpBalance),
          totalCirculated: Number(circPool.totalCirculated),
        }
      : null,
    walkConfig: walkConfig
      ? {
          annualTpLimit:       Number(walkConfig.annualTpLimit),
          distributedThisYear: Number(walkConfig.distributedThisYear),
          tpPerGoal:           Number(walkConfig.tpPerGoal),
          fundRatio:           Number(walkConfig.fundRatio),
          circulationRatio:    Number(walkConfig.circulationRatio),
        }
      : null,
  })
}
