import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DONGS } from '@/lib/constants'

export async function GET() {
  const session = await auth()
  if (!session?.user.roles?.includes('ADMIN')) {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  }

  const [total, byStatus, byDong, pendingHelp] = await Promise.all([
    prisma.goodStore.count({ where: { status: 'ACTIVE' } }),

    prisma.goodStore.groupBy({
      by: ['onboardingStatus'],
      where: { status: 'ACTIVE' },
      _count: { id: true },
    }),

    prisma.goodStore.groupBy({
      by: ['dong', 'onboardingStatus'],
      where: { status: 'ACTIVE' },
      _count: { id: true },
    }),

    prisma.storeHelpRequest.count({ where: { status: 'PENDING' } }),
  ])

  const statusMap: Record<string, number> = {}
  byStatus.forEach(r => { statusMap[r.onboardingStatus] = r._count.id })

  // 동별 온보딩 현황
  const dongMap: Record<string, { total: number; done: number }> = {}
  DONGS.forEach(d => { dongMap[d] = { total: 0, done: 0 } })
  byDong.forEach(r => {
    if (!dongMap[r.dong]) dongMap[r.dong] = { total: 0, done: 0 }
    dongMap[r.dong].total += r._count.id
    if (['FIRST_USE','ACTIVE'].includes(r.onboardingStatus)) {
      dongMap[r.dong].done += r._count.id
    }
  })

  const dongs = Object.entries(dongMap)
    .filter(([, v]) => v.total > 0)
    .map(([dong, v]) => ({ dong, ...v, pct: v.total > 0 ? Math.round(v.done / v.total * 100) : 0 }))
    .sort((a, b) => b.pct - a.pct)

  return NextResponse.json({
    total,
    pendingHelp,
    statusMap,
    dongs,
  })
}
