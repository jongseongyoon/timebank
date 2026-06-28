import type { Prisma } from '@prisma/client'

// 포인트는 현금과 같으므로 잔액 갱신과 원장 기록을 항상 한 트랜잭션 안에서 처리한다.
// (명세의 earn_points / redeem_points RPC를 Prisma 인터랙티브 트랜잭션으로 구현)

export type EarnParams = {
  memberId: string
  amount: number // 양수
  reason: string
  relatedPurchaseId?: string
  operator?: string
}

// 적립: 잔액 증가 + 원장 기록. 반드시 tx(트랜잭션 클라이언트) 안에서 호출.
export async function earnPoints(tx: Prisma.TransactionClient, p: EarnParams): Promise<number> {
  if (p.amount < 0) throw new Error('적립 금액은 0 이상이어야 합니다.')
  // increment는 DB 레벨에서 원자적. 반환값의 잔액을 원장에 그대로 기록.
  const member = await tx.tomatoMember.update({
    where: { id: p.memberId },
    data: { pointsBalance: { increment: p.amount } },
    select: { pointsBalance: true },
  })
  await tx.tomatoPointTransaction.create({
    data: {
      memberId: p.memberId,
      type: 'earn',
      amount: p.amount,
      balanceAfter: member.pointsBalance,
      reason: p.reason,
      relatedPurchaseId: p.relatedPurchaseId ?? null,
      operator: p.operator ?? null,
    },
  })
  return member.pointsBalance
}

export type RedeemParams = {
  memberId: string
  amount: number // 양수(차감할 금액)
  reason: string
  operator?: string
}

// 사용(차감): 잔액 부족 시 예외. 행 잠금으로 동시 차감 방지.
export async function redeemPoints(tx: Prisma.TransactionClient, p: RedeemParams): Promise<number> {
  if (p.amount <= 0) throw new Error('사용 금액은 1 이상이어야 합니다.')
  // SELECT ... FOR UPDATE 로 해당 회원 행을 잠근 뒤 잔액 확인
  const locked = await tx.$queryRaw<{ points_balance: number }[]>`
    SELECT "pointsBalance" AS points_balance FROM "TomatoMember" WHERE id = ${p.memberId} FOR UPDATE
  `
  if (!locked.length) throw new Error('회원을 찾을 수 없습니다.')
  const cur = Number(locked[0].points_balance)
  if (cur < p.amount) throw new Error(`포인트 잔액 부족 (보유 ${cur}, 요청 ${p.amount})`)

  const newBal = cur - p.amount
  await tx.tomatoMember.update({ where: { id: p.memberId }, data: { pointsBalance: newBal } })
  await tx.tomatoPointTransaction.create({
    data: {
      memberId: p.memberId,
      type: 'redeem',
      amount: -p.amount,
      balanceAfter: newBal,
      reason: p.reason,
      operator: p.operator ?? null,
    },
  })
  return newBal
}
