export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user.roles.includes('ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const members = await prisma.member.findMany({
    where: { status: 'ACTIVE' },
    select: { dong: true, roles: true, tpBalance: true },
  })

  const dongMap: Record<string, { members: number; providers: number; receivers: number; tpBalance: number }> = {}

  for (const m of members) {
    if (!dongMap[m.dong]) dongMap[m.dong] = { members: 0, providers: 0, receivers: 0, tpBalance: 0 }
    dongMap[m.dong].members += 1
    dongMap[m.dong].tpBalance += Number(m.tpBalance)
    if (m.roles.includes('PROVIDER')) dongMap[m.dong].providers += 1
    if (m.roles.includes('RECEIVER')) dongMap[m.dong].receivers += 1
  }

  const data = Object.entries(dongMap)
    .map(([dong, stats]) => ({ dong, ...stats, tpBalance: Math.round(stats.tpBalance * 100) / 100 }))
    .sort((a, b) => b.members - a.members)

  return NextResponse.json({ data })
}
