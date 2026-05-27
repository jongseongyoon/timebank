/**
 * GET /api/walk/fund-status
 * 만보기 재원(건강증진기금 + 순환풀) 현황 반환 (로그인 필요)
 *
 * 캐싱 전략:
 *  - 인증 여부: force-dynamic (매 요청마다 쿠키 확인)
 *  - DB 쿼리:   unstable_cache 5분 TTL — 기금 잔액은 자주 바뀌지 않음
 *    TP 지급(cron/batch) 후 revalidateTag('fund-status') 호출로 즉시 무효화 가능
 */
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// 기금 현황은 전체 사용자 공통 — 사용자 ID 불필요, 연도별로 캐시
const getFundStatus = unstable_cache(
  async (year: number) => {
    const [healthFund, circPool, walkConfig] = await Promise.all([
      prisma.healthFund.findUnique({ where: { id: 'health-fund-001' } }),
      prisma.circulationPool.findUnique({ where: { id: 'circulation-pool-001' } }),
      prisma.walkRewardConfig.findUnique({ where: { year } }),
    ])

    return {
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
    }
  },
  ['fund-status'],          // 캐시 키 prefix
  {
    revalidate: 300,        // 5분 TTL
    tags: ['fund-status'],  // revalidateTag('fund-status') 로 즉시 무효화 가능
  },
)

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const year = new Date().getFullYear()
  const data = await getFundStatus(year)

  return NextResponse.json(data)
}
