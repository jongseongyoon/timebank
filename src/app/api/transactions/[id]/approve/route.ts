export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { addToReserveFund } from '@/lib/reserve-fund'

export async function PATCH(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const isCoordinator = session.user.roles.some((r) => ['COORDINATOR', 'ADMIN'].includes(r))
  if (!isCoordinator) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const tx = await prisma.transaction.findUnique({ where: { id: params.id } })
  if (!tx) return NextResponse.json({ error: '거래 없음' }, { status: 404 })
  if (tx.status !== 'PENDING') return NextResponse.json({ error: '승인 불가 상태' }, { status: 400 })

  // 규칙 4: 코디네이터 이해충돌 금지
  if (tx.providerId === session.user.id || tx.receiverId === session.user.id) {
    return NextResponse.json({ error: 'COORDINATOR_CONFLICT_OF_INTEREST' }, { status: 400 })
  }

  // 수요자 잔액 재검증 (규칙 1)
  if (tx.receiverId) {
    const receiver = await prisma.member.findUnique({ where: { id: tx.receiverId } })
    if (!receiver || receiver.tpBalance.lessThan(tx.tpAmount)) {
      return NextResponse.json({ error: 'TC_INSUFFICIENT' }, { status: 400 })
    }
  }

  // 규칙 3: 반드시 DB 트랜잭션으로 처리
  const approved = await prisma.$transaction(async (trx) => {
    const updated = await trx.transaction.update({
      where: { id: params.id },
      data: { status: 'APPROVED' },
    })

    if (tx.providerId) {
      await trx.member.update({
        where: { id: tx.providerId },
        data: {
          tpBalance: { increment: tx.tpAmount },
          lifetimeEarned: { increment: tx.tpAmount },
        },
      })
    }

    if (tx.receiverId) {
      await trx.member.update({
        where: { id: tx.receiverId },
        data: {
          tpBalance: { decrement: tx.tpAmount },
          lifetimeSpent: { increment: tx.tpAmount },
        },
      })
    }

    // 지불준비금(순환 풀): 서비스 거래 금액의 5% 자동 적립
    // (providerId와 receiverId 모두 있는 실제 서비스 교환 거래에만 적용)
    if (tx.providerId && tx.receiverId) {
      await addToReserveFund(tx.tpAmount, params.id, trx as any)
    }

    // 알림 생성
    const notifications = []
    if (tx.providerId) {
      notifications.push(
        trx.notification.create({
          data: {
            memberId: tx.providerId,
            type: 'TX_APPROVED',
            title: '거래 승인 완료',
            body: `${tx.tpAmount} TP가 적립되었습니다.`,
            link: `/history`,
          },
        })
      )
    }
    if (tx.receiverId) {
      notifications.push(
        trx.notification.create({
          data: {
            memberId: tx.receiverId,
            type: 'TX_APPROVED',
            title: '거래 승인 완료',
            body: `${tx.tpAmount} TP가 차감되었습니다.`,
            link: `/history`,
          },
        })
      )
    }
    await Promise.all(notifications)

    return updated
  })

  return NextResponse.json({ transaction: approved })
}
