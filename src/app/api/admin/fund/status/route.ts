export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user.roles.includes('ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [tcAgg, fundAgg] = await Promise.all([
    prisma.member.aggregate({ _sum: { tcBalance: true } }),
    prisma.fundTransaction.aggregate({ _sum: { tcEquivalent: true, cashAmount: true } }),
  ])

  const totalTC = Number(tcAgg._sum.tcBalance ?? 0)
  const fundTC = Number(fundAgg._sum.tcEquivalent ?? 0)
  const fundCash = Number(fundAgg._sum.cashAmount ?? 0)
  const reserveRatio = totalTC > 0 ? Math.round((fundTC / totalTC) * 100) : 0

  return NextResponse.json({ totalTC, fundTC, fundCash, reserveRatio })
}
