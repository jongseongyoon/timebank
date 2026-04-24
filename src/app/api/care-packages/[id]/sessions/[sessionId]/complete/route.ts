export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

// 세션 완료 처리 → Transaction 자동 생성 + TC 이동
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; sessionId: string } }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const isCoordOrAdmin = session.user.roles.some(r => ['COORDINATOR', 'ADMIN'].includes(r))
  if (!isCoordOrAdmin) return NextResponse.json({ error: '권한 필요' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const note = body.note as string | undefined

  const careSession = await prisma.careSession.findUnique({
    where: { id: params.sessionId },
    include: {
      package: {
        include: {
          recipient: true,
          organization: true,
        },
      },
      provider: true,
    },
  })

  if (!careSession) return NextResponse.json({ error: '세션 없음' }, { status: 404 })
  if (careSession.packageId !== params.id) return NextResponse.json({ error: '패키지 불일치' }, { status: 400 })
  if (careSession.status !== 'SCHEDULED') return NextResponse.json({ error: '이미 처리된 세션' }, { status: 400 })

  const pkg = careSession.package
  const tcAmount = Number(careSession.tcAmount)
  const durationMinutes = careSession.durationMinutes

  const txHash = crypto.createHash('sha256')
    .update(`care-session-${careSession.id}-${Date.now()}`)
    .digest('hex')

  // 원자적 처리:
  // 1. Transaction 생성 (APPROVED)
  // 2. 제공자 TC 적립 (isSavings=true → 장기저축)
  // 3. 수혜자 TC 차감
  // 4. 단체 TC 차감 (패키지 배분한 단체)
  // 5. CareSession 완료
  // 6. CarePackage usedTcAmount 증가

  const [tx] = await prisma.$transaction([
    // 1. 거래 생성
    prisma.transaction.create({
      data: {
        txType: 'ORG_TO_INDIVIDUAL',
        status: 'APPROVED',
        verificationMethod: 'COORDINATOR',
        durationMinutes,
        tcAmount,
        baseRate: tcAmount / (durationMinutes / 60),
        bonusRate: 0,
        txHash,
        note: note ?? `돌봄패키지 세션 완료: ${pkg.title}`,
        coordinatorId: session.user.id,
        providerId: careSession.providerId,
        receiverId: pkg.recipientId,
        organizationId: pkg.organizationId ?? undefined,
        completedAt: new Date(),
        isSavings: true,  // 제공자 TC는 장기저축
      },
    }),

    // 2. 제공자 TC 적립 (C학생, D학생의 미래 돌봄 저축)
    prisma.member.update({
      where: { id: careSession.providerId },
      data: {
        tcBalance: { increment: tcAmount },
        lifetimeEarned: { increment: tcAmount },
      },
    }),

    // 3. 수혜자 TC 차감 (A어르신의 배분받은 TC 사용)
    prisma.member.update({
      where: { id: pkg.recipientId },
      data: {
        tcBalance: { decrement: tcAmount },
        lifetimeSpent: { increment: tcAmount },
      },
    }),

    // 4. 패키지 usedTcAmount 갱신
    prisma.carePackage.update({
      where: { id: pkg.id },
      data: { usedTcAmount: { increment: tcAmount } },
    }),
  ])

  // 5. 세션 상태 업데이트 + transactionId 연결
  const updatedSession = await prisma.careSession.update({
    where: { id: careSession.id },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      transactionId: tx.id,
    },
  })

  // 단체 TC 차감 (단체가 수혜자에게 배분한 TC)
  if (pkg.organizationId) {
    await prisma.organization.update({
      where: { id: pkg.organizationId },
      data: { tcBalance: { decrement: tcAmount } },
    })
  }

  // 패키지 전체 완료 확인
  const remaining = await prisma.careSession.count({
    where: { packageId: pkg.id, status: 'SCHEDULED' },
  })
  if (remaining === 0) {
    const allDone = await prisma.careSession.count({
      where: { packageId: pkg.id, status: { not: 'COMPLETED' }, NOT: { status: 'CANCELLED' } },
    })
    if (allDone === 0) {
      await prisma.carePackage.update({
        where: { id: pkg.id },
        data: { status: 'COMPLETED' },
      })
    }
  }

  return NextResponse.json({ session: updatedSession, transaction: tx })
}
