export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user.roles.includes('ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const days = Number(req.nextUrl.searchParams.get('days') ?? '30')
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const txs = await prisma.transaction.findMany({
    where: { status: 'APPROVED', createdAt: { gte: since } },
    include: { serviceListing: { select: { category: true } } },
  })

  const map: Record<string, { txCount: number; totalTC: number }> = {}
  for (const tx of txs) {
    const cat = tx.serviceListing?.category ?? 'OTHER'
    if (!map[cat]) map[cat] = { txCount: 0, totalTC: 0 }
    map[cat].txCount += 1
    map[cat].totalTC += Number(tx.tcAmount)
  }

  const data = Object.entries(map).map(([category, stats]) => ({
    category,
    txCount: stats.txCount,
    totalTC: Math.round(stats.totalTC * 100) / 100,
  })).sort((a, b) => b.totalTC - a.totalTC)

  return NextResponse.json({ data })
}
