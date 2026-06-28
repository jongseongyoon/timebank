'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireTomatoOperator } from '@/lib/tomato/access'

export type ActionResult = { ok: true } | { error: string }

const categorySchema = z.object({
  name: z.string().trim().min(1, '카테고리 이름을 입력하세요'),
  managementYears: z.coerce.number().int().min(0, '0 이상').max(50, '50 이하'),
  // 화면에서는 %로 입력받고 저장은 소수(0.02)로 변환
  pointPercent: z.coerce.number().min(0, '0 이상').max(100, '100 이하'),
})

export async function createCategory(input: unknown): Promise<ActionResult> {
  await requireTomatoOperator()
  const parsed = categorySchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const { name, managementYears, pointPercent } = parsed.data
  try {
    await prisma.tomatoProductCategory.create({
      data: { name, managementYears, pointRate: pointPercent / 100 },
    })
  } catch (e: any) {
    if (e?.code === 'P2002') return { error: `이미 있는 이름입니다: ${name}` }
    return { error: '저장 중 오류가 발생했습니다.' }
  }
  revalidatePath('/tomato/categories')
  return { ok: true }
}

const updateSchema = categorySchema.extend({ id: z.string().min(1) })

export async function updateCategory(input: unknown): Promise<ActionResult> {
  await requireTomatoOperator()
  const parsed = updateSchema.safeParse(input)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const { id, name, managementYears, pointPercent } = parsed.data
  try {
    await prisma.tomatoProductCategory.update({
      where: { id },
      data: { name, managementYears, pointRate: pointPercent / 100 },
    })
  } catch (e: any) {
    if (e?.code === 'P2002') return { error: `이미 있는 이름입니다: ${name}` }
    return { error: '수정 중 오류가 발생했습니다.' }
  }
  revalidatePath('/tomato/categories')
  return { ok: true }
}

export async function toggleCategory(id: string, active: boolean): Promise<ActionResult> {
  await requireTomatoOperator()
  try {
    await prisma.tomatoProductCategory.update({ where: { id }, data: { active } })
  } catch {
    return { error: '상태 변경 중 오류가 발생했습니다.' }
  }
  revalidatePath('/tomato/categories')
  return { ok: true }
}
