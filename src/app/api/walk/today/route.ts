export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { kstToday } from '@/lib/kst'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const today = kstToday()  // UTC → KST 기준 날짜
  const record = await prisma.walkRecord.findUnique({
    where: { memberId_date: { memberId: session.user.id, date: today } },
  })

  return NextResponse.json({
    steps:             record?.steps     ?? 0,
    rewarded:          record?.rewarded  ?? false,
    tpFromFund:        record?.tpFromFund        ? Number(record.tpFromFund)        : null,
    tpFromCirculation: record?.tpFromCirculation ? Number(record.tpFromCirculation) : null,
    goal: 10000,
    date: today,
  })
}
