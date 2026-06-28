'use server'

import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redeemPoints } from '@/lib/tomato/points'

async function requireOperator() {
  const session = await auth()
  if (!session?.user?.roles?.includes('ADMIN')) throw new Error('권한이 없습니다.')
  return session.user.name ?? '직원'
}

export type ScannedMember = {
  id: string
  name: string
  memberNo: string | null
  phone: string | null
  pointsBalance: number
}

export type LookupResult = { member: ScannedMember } | { error: string }

// QR 토큰으로 회원 조회
export async function lookupByToken(token: string): Promise<LookupResult> {
  await requireOperator()
  const t = token.trim()
  if (!t) return { error: 'QR 값이 비어 있습니다.' }
  const member = await prisma.tomatoMember.findUnique({
    where: { qrToken: t },
    select: { id: true, name: true, memberNo: true, phone: true, pointsBalance: true },
  })
  if (!member) return { error: '등록된 회원이 아닙니다.' }
  return { member }
}

const redeemSchema = z.object({
  memberId: z.string().min(1),
  amount: z.coerce.number().int().min(1, '1 이상 입력하세요'),
  reason: z.string().trim().min(1, '사유를 선택하세요'),
})

export type ScanRedeemResult = { ok: true; balance: number } | { error: string }

// 스캔 화면에서 포인트 사용
export async function scanRedeem(input: unknown): Promise<ScanRedeemResult> {
  const operator = await requireOperator()
  const parsed = redeemSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.errors[0].message }
  const { memberId, amount, reason } = parsed.data
  try {
    const balance = await prisma.$transaction((tx) =>
      redeemPoints(tx, { memberId, amount, reason, operator })
    )
    return { ok: true, balance }
  } catch (e: any) {
    return { error: e?.message ?? '사용 처리 중 오류가 발생했습니다.' }
  }
}
