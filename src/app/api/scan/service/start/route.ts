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

const MIN_BALANCE = -3.0  // 수혜자 최저 잔액 한도

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

  // 수혜자 잔액 확인
  const receiver = await prisma.member.findUnique({
    where: { id: receiverId },
    select: { id: true, tcBalance: true, name: true },
  })
  if (!receiver) return NextResponse.json({ error: '수혜자 없음' }, { status: 404 })

  const receiverBalance = Number(receiver.tcBalance)
  const maxPayable = receiverBalance - MIN_BALANCE  // 수혜자가 지불 가능한 최대 TP

  // 이미 한도 도달 시 거래 시작 불가
  if (maxPayable <= 0) {
    return NextResponse.json({
      error: `${receiver.name}님의 TP 잔액이 한도(-3.0 TP)에 도달하여 거래를 시작할 수 없습니다.`,
      receiverBalance,
      maxPayable: 0,
    }, { status: 400 })
  }

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

  // 최대 획득 가능 TP 정보 포함하여 반환 (프론트엔드 auto-stop 용도)
  return NextResponse.json({
    transaction: tx,
    receiverBalance,
    maxPayable: Math.round(maxPayable * 100) / 100,
    maxMinutes: Math.round(maxPayable * 60),  // 최대 서비스 가능 분
  }, { status: 201 })
}
