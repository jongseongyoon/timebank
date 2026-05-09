import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Member 테이블 컬럼 목록
  const cols = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, column_default, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Member'
    ORDER BY ordinal_position
  `)
  console.log('\n=== Member 테이블 컬럼 ===')
  console.table(cols)

  // PushSubscription 테이블 존재 여부
  const psExists = await prisma.$queryRawUnsafe(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'PushSubscription'
    ) AS exists
  `)
  console.log('\n=== PushSubscription 테이블 존재 ===', psExists)

  // 실제 로그인 테스트 (첫 번째 ACTIVE 멤버 조회)
  const testMember = await prisma.member.findFirst({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true, phone: true, tpBalance: true, roles: true }
  })
  console.log('\n=== 테스트 멤버 조회 ===', testMember)
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error('\n❌ 오류:', e.message); process.exit(1) })
