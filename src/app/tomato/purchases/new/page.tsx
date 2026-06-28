export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { PurchaseForm, type CategoryOpt } from '@/components/tomato/purchase-form'
import type { MemberHit } from '@/app/tomato/purchases/actions'

export default async function NewPurchasePage({
  searchParams,
}: {
  searchParams: { memberId?: string }
}) {
  const cats = await prisma.tomatoProductCategory.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
  })
  const categories: CategoryOpt[] = cats.map((c) => ({
    id: c.id,
    name: c.name,
    managementYears: c.managementYears,
    pointPercent: Number(c.pointRate) * 100,
  }))

  // QR 스캔 등에서 회원을 미리 지정한 경우
  let initialMember: MemberHit | null = null
  if (searchParams.memberId) {
    const m = await prisma.tomatoMember.findUnique({
      where: { id: searchParams.memberId },
      select: { id: true, name: true, memberNo: true, phone: true, pointsBalance: true },
    })
    if (m) initialMember = m
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">구매 등록</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          회원과 제품을 선택하면 적립 포인트(구매액 2% 반올림)와 관리기한이 자동 계산됩니다.
        </p>
      </div>
      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          먼저 <Link href="/tomato/categories" className="text-red-700 underline">제품 카테고리</Link>를
          등록하세요.
        </p>
      ) : (
        <PurchaseForm categories={categories} initialMember={initialMember} />
      )}
    </div>
  )
}
