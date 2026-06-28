'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redeemPoints, adjustPoints } from '@/lib/tomato/points'

async function requireOperator() {
  const session = await auth()
  if (!session?.user?.roles?.includes('ADMIN')) throw new Error('권한이 없습니다.')
  return session.user.name ?? '직원'
}

export type PointActionResult = { ok: true; balance: number } | { error: string }

const redeemSchema = z.object({
  memberId: z.string().min(1),
  amount: z.coerce.number().int().min(1, '1 이상 입력하세요'),
  reason: z.string().trim().min(1, '사유를 선택하세요'),
})

export async function redeemAction(input: unknown): Promise<PointActionResult> {
  const operator = await requireOperator()
  const parsed = redeemSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.errors[0].message }
  const { memberId, amount, reason } = parsed.data
  try {
    const balance = await prisma.$transaction((tx) =>
      redeemPoints(tx, { memberId, amount, reason, operator })
    )
    revalidatePath(`/tomato/members/${memberId}`)
    return { ok: true, balance }
  } catch (e: any) {
    return { error: e?.message ?? '사용 처리 중 오류가 발생했습니다.' }
  }
}

const adjustSchema = z.object({
  memberId: z.string().min(1),
  amount: z.coerce.number().int().refine((n) => n !== 0, '0이 아닌 값을 입력하세요'),
  reason: z.string().trim().min(1, '사유를 입력하세요'),
})

export async function adjustAction(input: unknown): Promise<PointActionResult> {
  const operator = await requireOperator()
  const parsed = adjustSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.errors[0].message }
  const { memberId, amount, reason } = parsed.data
  try {
    const balance = await prisma.$transaction((tx) =>
      adjustPoints(tx, { memberId, amount, reason, operator })
    )
    revalidatePath(`/tomato/members/${memberId}`)
    return { ok: true, balance }
  } catch (e: any) {
    return { error: e?.message ?? '조정 처리 중 오류가 발생했습니다.' }
  }
}
