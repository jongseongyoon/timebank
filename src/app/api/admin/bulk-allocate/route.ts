export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

type AllocRow = {
  phone: string
  name: string
  tcAmount: number
  reason: string
}

// 엑셀 일괄 배분 처리
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  if (!session.user.roles.includes('ADMIN')) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const body = await req.json()
  const rows: AllocRow[] = body.rows

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: '데이터 없음' }, { status: 400 })
  }

  const results: { phone: string; name: string; tcAmount: number; status: 'success' | 'error'; reason: string }[] = []

  for (const row of rows) {
    try {
      const member = await prisma.member.findUnique({ where: { phone: row.phone } })
      if (!member) {
        results.push({ ...row, status: 'error', reason: '미등록 회원' })
        continue
      }

      const txHash = crypto.createHash('sha256')
        .update(`bulk-allocate-${member.id}-${row.tcAmount}-${Date.now()}-${Math.random()}`)
        .digest('hex')

      await prisma.$transaction([
        prisma.transaction.create({
          data: {
            txType: 'FREE_ALLOCATION',
            status: 'APPROVED',
            verificationMethod: 'COORDINATOR',
            durationMinutes: 0,
            tcAmount: row.tcAmount,
            baseRate: 0,
            bonusRate: 0,
            txHash,
            note: row.reason || '일괄 배분',
            coordinatorId: session.user.id,
            receiverId: member.id,
            completedAt: new Date(),
          },
        }),
        prisma.member.update({
          where: { id: member.id },
          data: {
            tcBalance: { increment: row.tcAmount },
            lifetimeEarned: { increment: row.tcAmount },
          },
        }),
      ])

      results.push({ phone: row.phone, name: member.name, tcAmount: row.tcAmount, status: 'success', reason: row.reason })
    } catch {
      results.push({ ...row, status: 'error', reason: '처리 오류' })
    }
  }

  // 감사 로그
  await prisma.auditLog.create({
    data: {
      adminId: session.user.id,
      action: 'BULK_ALLOCATE',
      details: JSON.stringify({ count: rows.length, results }),
    },
  })

  return NextResponse.json({ results })
}
