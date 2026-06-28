// 토마토의료기 초기 제품 카테고리 시드
// 실행: node scripts/seed-tomato-categories.mjs
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// 관리연수·적립률(기본 2%) — 명세 확정값
const CATEGORIES = [
  { name: '전동스쿠터', managementYears: 6, pointRate: 0.02 },
  { name: '전동휠체어', managementYears: 6, pointRate: 0.02 },
  { name: '수동휠체어', managementYears: 5, pointRate: 0.02 },
]

async function main() {
  for (const c of CATEGORIES) {
    const row = await prisma.tomatoProductCategory.upsert({
      where: { name: c.name },
      update: { managementYears: c.managementYears },
      create: c,
    })
    console.log(`✓ ${row.name} (관리 ${row.managementYears}년, 적립 ${Number(row.pointRate) * 100}%)`)
  }
  console.log('토마토 카테고리 시드 완료')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
