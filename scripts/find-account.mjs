import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

const phone = '010-8839-0326'

const member = await prisma.member.findUnique({
  where: { phone },
  select: {
    id: true, name: true, phone: true,
    status: true, roles: true,
    tpBalance: true, lifetimeEarned: true,
    dong: true, createdAt: true,
    passwordHash: true,
  },
})

if (member) {
  console.log('✅ 계정 존재:')
  console.log(JSON.stringify({ ...member, passwordHash: member.passwordHash ? '(있음)' : '(없음)' }, null, 2))
} else {
  console.log('❌ 해당 전화번호 계정 없음:', phone)
  const total = await prisma.member.count()
  console.log('현재 DB 전체 회원 수:', total)
  const all = await prisma.member.findMany({ select: { name: true, phone: true, status: true, createdAt: true } })
  console.log('전체 계정 목록:', JSON.stringify(all, null, 2))
}

await prisma.$disconnect()
