export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

// 기존 회원 qrCode 자동 생성 (최초 발급 시 1 TP 무상 지급)
export async function POST() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const member = await prisma.member.findUnique({
    where: { id: session.user.id },
    select: { id: true, qrCode: true },
  })
  if (!member) return NextResponse.json({ error: '회원 없음' }, { status: 404 })

  // 이미 있으면 그대로 반환
  if (member.qrCode) return NextResponse.json({ qrCode: member.qrCode })

  // 없으면 생성 후 저장 + 1 TP 무상 지급
  const qrCode = `timepay:member:${member.id}`

  const txHash = crypto.createHash('sha256')
    .update(`qr-first-issue-${member.id}-${Date.now()}`)
    .digest('hex')

  await prisma.$transaction([
    // QR 코드 저장 + 잔액 +1
    prisma.member.update({
      where: { id: session.user.id },
      data: {
        qrCode,
        tcBalance: { increment: 1 },
        lifetimeEarned: { increment: 1 },
      },
    }),
    // 무상 지급 거래 기록
    prisma.transaction.create({
      data: {
        txType: 'FREE_ALLOCATION',
        status: 'APPROVED',
        verificationMethod: 'APP_QR',
        durationMinutes: 60,   // 1시간 = 1 TP
        tcAmount: 1,
        baseRate: 1,
        bonusRate: 0,
        txHash,
        note: 'QR 코드 최초 발급 기념 1 TP 무상 지급',
        coordinatorId: session.user.id,
        receiverId: session.user.id,
        completedAt: new Date(),
      },
    }),
    // 알림 생성
    prisma.notification.create({
      data: {
        memberId: session.user.id,
        type: 'QR_ISSUED',
        title: '🎉 QR 코드 발급 완료!',
        body: 'QR 코드가 발급되었습니다. 첫 발급 기념으로 1 TP가 지갑에 적립됐어요.',
        link: '/wallet',
      },
    }),
  ])

  return NextResponse.json({ qrCode, bonusAwarded: true, bonusAmount: 1 })
}
