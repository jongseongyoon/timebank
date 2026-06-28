export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'
import { CategoryManager, type Category } from '@/components/tomato/category-manager'

export default async function TomatoCategoriesPage() {
  const rows = await prisma.tomatoProductCategory.findMany({
    orderBy: [{ active: 'desc' }, { name: 'asc' }],
  })

  const categories: Category[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    managementYears: r.managementYears,
    pointPercent: Number(r.pointRate) * 100,
    active: r.active,
  }))

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">제품 카테고리</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          제품 종류별 관리연수와 포인트 적립률을 관리합니다. 구매 등록 시 이 설정으로 관리기한과
          적립 포인트가 자동 계산됩니다.
        </p>
      </div>
      <CategoryManager categories={categories} />
    </div>
  )
}
