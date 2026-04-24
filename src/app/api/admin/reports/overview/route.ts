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

  const [
    totalMembers,
    activeMembers,
    vulnerableMembers,
    providerCount,
    receiverCount,
    tcAgg,
    approvedTx,
    pendingTx,
    cancelledTx,
  ] = await Promise.all([
    prisma.member.count(),
    prisma.member.count({ where: { status: 'ACTIVE' } }),
    prisma.member.count({ where: { isVulnerable: true, status: 'ACTIVE' } }),
    prisma.member.count({ where: { roles: { has: 'PROVIDER' }, status: 'ACTIVE' } }),
    prisma.member.count({ where: { roles: { has: 'RECEIVER' }, status: 'ACTIVE' } }),
    prisma.member.aggregate({ _sum: { tcBalance: true } }),
    prisma.transaction.count({ where: { status: 'APPROVED', createdAt: { gte: since } } }),
    prisma.transaction.count({ where: { status: 'PENDING' } }),
    prisma.transaction.count({ where: { status: 'CANCELLED', createdAt: { gte: since } } }),
  ])

  return NextResponse.json({
    totalMembers,
    activeMembers,
    vulnerableMembers,
    providerCount,
    receiverCount,
    totalTC: Number(tcAgg._sum.tcBalance ?? 0),
    monthlyTx: approvedTx,
    approvedTx,
    pendingTx,
    cancelledTx,
  })
}
