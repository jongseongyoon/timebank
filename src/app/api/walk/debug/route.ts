/**
 * GET /api/walk/debug
 * 만보기 진단 정보 — 로그인한 회원의 WalkRecord + 시스템 상태
 */
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { kstToday, kstYear } from '@/lib/kst'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const memberId = session.user.id
  const today    = kstToday()   // KST 기준 (UTC 사용 시 자정~09시 날짜 어긋남)
  const year     = kstYear()

  const [recentRecords, todayRecord, healthFund, walkConfig, member] = await Promise.all([
    // 최근 10개 WalkRecord
    prisma.walkRecord.findMany({
      where:   { memberId },
      orderBy: { date: 'desc' },
      take:    10,
    }),
    // 오늘 기록
    prisma.walkRecord.findUnique({
      where: { memberId_date: { memberId, date: today } },
    }),
    // 건강증진 기금 잔액
    prisma.healthFund.findUnique({ where: { id: 'health-fund-001' } }),
    // 연간 설정
    prisma.walkRewardConfig.findUnique({ where: { year } }),
    // 회원 TP 잔액
    prisma.member.findUnique({ where: { id: memberId }, select: { tpBalance: true, name: true } }),
  ])

  const fundBalance    = Number(healthFund?.tpBalance ?? 0)
  const annualIssued   = Number(walkConfig?.distributedThisYear ?? 0)
  const annualLimit    = Number(walkConfig?.annualTpLimit ?? 0)
  const annualExceeded = annualIssued >= annualLimit

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    today,
    memberId,
    memberName:  member?.name ?? '(알 수 없음)',
    tpBalance:   Number(member?.tpBalance ?? 0),

    // 오늘 기록
    todayRecord: todayRecord ? {
      date:              todayRecord.date,
      steps:             todayRecord.steps,
      rewarded:          todayRecord.rewarded,
      tpFromFund:        Number(todayRecord.tpFromFund ?? 0),
      tpFromCirculation: Number(todayRecord.tpFromCirculation ?? 0),
      tpSource:          (todayRecord as any).tpSource ?? null,
      tpAwardedAt:       (todayRecord as any).tpAwardedAt ?? null,
      createdAt:         todayRecord.createdAt,
    } : null,

    // 최근 기록 10개
    recentRecords: recentRecords.map(r => ({
      date:     r.date,
      steps:    r.steps,
      rewarded: r.rewarded,
      tpFromFund: Number(r.tpFromFund ?? 0),
    })),

    // 시스템 상태
    system: {
      healthFundBalance: fundBalance,
      healthFundOk:      fundBalance >= 0.5,
      annualIssued,
      annualLimit,
      annualExceeded,
      walkConfigExists:  !!walkConfig,
    },

    // 진단 결론
    diagnosis: (() => {
      const issues: string[] = []
      if (!walkConfig)            issues.push('❌ WalkRewardConfig 없음 — seed 재실행 필요')
      if (annualExceeded)         issues.push(`❌ 연간 발행 한도 초과 (${annualIssued}/${annualLimit} TP)`)
      if (fundBalance < 0.5)      issues.push(`❌ 건강증진 기금 잔액 부족 (${fundBalance} TP < 0.5 TP) — 관리자 충전 필요`)
      if (!todayRecord)           issues.push('⚠️ 오늘 WalkRecord 없음 — 걸음 수 저장이 한 번도 안 됨')
      if (todayRecord && todayRecord.steps < 10000 && !todayRecord.rewarded)
                                  issues.push(`⚠️ 오늘 걸음 수 ${todayRecord.steps}보 — 아직 1만보 미달성`)
      if (todayRecord?.rewarded)  issues.push('✅ 오늘 이미 TP 지급 완료')
      if (issues.length === 0)    issues.push('✅ 시스템 정상 — TP 지급 가능 상태')
      return issues
    })(),
  })
}
