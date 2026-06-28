'use server'

import { z } from 'zod'
import { addYears } from 'date-fns'
import { prisma } from '@/lib/prisma'
import { earnPoints } from '@/lib/tomato/points'
import { requireTomatoOperator as requireOperator } from '@/lib/tomato/access'

export type MemberHit = {
  id: string
  name: string
  memberNo: string | null
  phone: string | null
  pointsBalance: number
}

// 구매 등록용 회원 검색(상위 10명)
export async function searchMembers(q: string): Promise<MemberHit[]> {
  await requireOperator()
  const query = q.trim()
  if (!query) return []
  const rows = await prisma.tomatoMember.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { memberNo: { contains: query, mode: 'insensitive' } },
        { phone: { contains: query } },
      ],
    },
    orderBy: { name: 'asc' },
    take: 10,
    select: { id: true, name: true, memberNo: true, phone: true, pointsBalance: true },
  })
  return rows
}

const purchaseSchema = z.object({
  memberId: z.string().min(1, '회원을 선택하세요'),
  categoryId: z.string().min(1, '카테고리를 선택하세요'),
  productName: z.string().trim().optional(),
  serialNo: z.string().trim().optional(),
  purchaseDate: z.string().min(1, '구매일을 입력하세요'),
  purchaseAmount: z.coerce.number().int().min(0, '구매액을 입력하세요'),
  memo: z.string().trim().optional(),
})

export type PurchaseResult =
  | { ok: true; pointsEarned: number; balance: number; dueDate: string }
  | { error: string }

export async function createPurchase(input: unknown): Promise<PurchaseResult> {
  const operator = await requireOperator()
  const parsed = purchaseSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.errors[0].message }
  const d = parsed.data

  const category = await prisma.tomatoProductCategory.findUnique({ where: { id: d.categoryId } })
  if (!category) return { error: '카테고리를 찾을 수 없습니다.' }

  const purchaseDate = new Date(d.purchaseDate)
  if (isNaN(purchaseDate.getTime())) return { error: '구매일 형식이 올바르지 않습니다.' }

  const rate = Number(category.pointRate)
  const pointsEarned = Math.round(d.purchaseAmount * rate) // 반올림 규칙
  const dueDate = addYears(purchaseDate, category.managementYears)

  try {
    const out = await prisma.$transaction(async (tx) => {
      const purchase = await tx.tomatoPurchase.create({
        data: {
          memberId: d.memberId,
          categoryId: d.categoryId,
          productName: d.productName || null,
          serialNo: d.serialNo || null,
          purchaseDate,
          purchaseAmount: d.purchaseAmount,
          pointsEarned,
          managementDueDate: dueDate,
          memo: d.memo || null,
        },
      })
      let balance = 0
      if (pointsEarned > 0) {
        balance = await earnPoints(tx, {
          memberId: d.memberId,
          amount: pointsEarned,
          reason: '구매적립',
          relatedPurchaseId: purchase.id,
          operator,
        })
      } else {
        const m = await tx.tomatoMember.findUnique({
          where: { id: d.memberId },
          select: { pointsBalance: true },
        })
        balance = m?.pointsBalance ?? 0
      }
      return balance
    })
    return {
      ok: true,
      pointsEarned,
      balance: out,
      dueDate: dueDate.toISOString().slice(0, 10),
    }
  } catch {
    return { error: '구매 등록 중 오류가 발생했습니다.' }
  }
}
