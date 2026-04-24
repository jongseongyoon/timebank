export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { z } from 'zod'

const schema = z.object({
  receiverId: z.string().uuid(),   // 서비스 받는 사람
  category: z.string(),
  note: z.string().max(200).optional(),
})

// QR로 서비스 시작 → IN_PROGRESS 거래 생성
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { receiverId, category, note } = parsed.data
  const providerId = session.user.id

  if (providerId === receiverId) return NextResponse.json({ error: '자기 자신과 거래 불가' }, { status: 400 })

  const txHash = crypto.createHash('sha256')
    .update(`qr-service-start-${providerId}-${receiverId}-${Date.now()}`)
    .digest('hex')

  const tx = await prisma.transaction.create({
    data: {
      txType: 'PEER_TO_PEER',
      status: 'IN_PROGRESS',
      verificationMethod: 'APP_QR',
      durationMinutes: 0,     // 종료 시 계산
      tcAmount: 0,            // 종료 시 계산
      baseRate: 1,
      bonusRate: 0,
      txHash,
      note: note ?? `${category} 서비스 시작`,
      coordinatorId: providerId,
      providerId,
      receiverId,
      startedAt: new Date(),
    },
  })

  return NextResponse.json({ transaction: tx }, { status: 201 })
}
