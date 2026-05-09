import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // 전체 멤버 수
  const total = await prisma.member.count()
  console.log('전체 멤버 수:', total)

  // status별 분포
  const byStatus = await prisma.$queryRawUnsafe(`
    SELECT status, COUNT(*) as cnt FROM "Member" GROUP BY status
  `)
  console.log('status별:', byStatus)

  // 첫 5개 멤버 (status 무관)
  const all = await prisma.member.findMany({
    take: 5,
    select: { id: true, name: true, phone: true, status: true, roles: true, passwordHash: true }
  })
  console.log('멤버 샘플:', JSON.stringify(all.map(m => ({
    ...m,
    passwordHash: m.passwordHash ? '(있음)' : '(없음)'
  })), null, 2))

  // 로그인 API와 동일하게 phone으로 조회 테스트
  const byPhone = await prisma.member.findUnique({ where: { phone: '010-0000-0000' } })
  console.log('\n010-0000-0000 조회:', byPhone ? '있음' : '없음')
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => { console.error('❌', e.message); process.exit(1) })
