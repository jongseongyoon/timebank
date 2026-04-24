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
    select: { dong: true, roles: true, tcBalance: true },
  })

  const dongMap: Record<string, { members: number; providers: number; receivers: number; tcBalance: number }> = {}

  for (const m of members) {
    if (!dongMap[m.dong]) dongMap[m.dong] = { members: 0, providers: 0, receivers: 0, tcBalance: 0 }
    dongMap[m.dong].members += 1
    dongMap[m.dong].tcBalance += Number(m.tcBalance)
    if (m.roles.includes('PROVIDER')) dongMap[m.dong].providers += 1
    if (m.roles.includes('RECEIVER')) dongMap[m.dong].receivers += 1
  }

  const data = Object.entries(dongMap)
    .map(([dong, stats]) => ({ dong, ...stats, tcBalance: Math.round(stats.tcBalance * 100) / 100 }))
    .sort((a, b) => b.members - a.members)

  return NextResponse.json({ data })
}
