export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const today = new Date().toISOString().slice(0, 10)
  const record = await prisma.walkRecord.findUnique({
    where: { memberId_date: { memberId: session.user.id, date: today } },
  })

  return NextResponse.json({
    steps: record?.steps ?? 0,
    rewarded: record?.rewarded ?? false,
    goal: 10000,
    date: today,
  })
}
