import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
const prisma = new PrismaClient()

const PHONE    = '010-8839-0326'
const PASSWORD = 'Timebank2026'
const NAME     = '관리자'
const DONG     = '치평동'

const existing = await prisma.member.findUnique({ where: { phone: PHONE } })
if (existing) {
  console.log('이미 존재합니다:', existing.name)
  await prisma.$disconnect()
  process.exit(0)
}

const passwordHash = await bcrypt.hash(PASSWORD, 12)

const member = await prisma.member.create({
  data: {
    phone: PHONE,
    passwordHash,
    name: NAME,
    dong: DONG,
    roles: ['ADMIN', 'COORDINATOR', 'PROVIDER', 'RECEIVER'],
    status: 'ACTIVE',
    memberType: 'INDIVIDUAL',
    tpBalance: 100,
    lifetimeEarned: 100,
  },
})

console.log('✅ 계정 복원 완료')
console.log('   전화번호:', member.phone)
console.log('   비밀번호: Timebank2026')
console.log('   역할:', member.roles.join(', '))

await prisma.$disconnect()
