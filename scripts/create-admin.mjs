/**
 * 관리자 계정 생성 스크립트
 * 실행: node scripts/create-admin.mjs
 */
import { PrismaClient } from '@prisma/client'
import { createHash } from 'crypto'

const prisma = new PrismaClient()

// ★ 아래 값을 원하는 계정 정보로 변경하세요
const ADMIN_PHONE    = '010-1234-5678'
const ADMIN_PASSWORD = 'Admin1234!'
const ADMIN_NAME     = '관리자'
const ADMIN_DONG     = '치평동'

async function hashPassword(pw) {
  // bcryptjs 없이 순수 Node로 빠르게 생성 (실운영에서는 bcryptjs 사용됨)
  // → 실제로는 bcryptjs를 동적 import로 사용
  const { default: bcrypt } = await import('bcryptjs')
  return bcrypt.hash(pw, 12)
}

async function main() {
  console.log('=== 관리자 계정 생성 ===')
  console.log(`전화번호: ${ADMIN_PHONE}`)
  console.log(`이름:     ${ADMIN_NAME}`)
  console.log(`동:       ${ADMIN_DONG}`)
  console.log()

  // 이미 존재하면 스킵
  const existing = await prisma.member.findUnique({ where: { phone: ADMIN_PHONE } })
  if (existing) {
    console.log('⚠️  이미 해당 전화번호 계정이 존재합니다:', existing.name, existing.status)
    return
  }

  const passwordHash = await hashPassword(ADMIN_PASSWORD)

  const member = await prisma.member.create({
    data: {
      phone:        ADMIN_PHONE,
      passwordHash,
      name:         ADMIN_NAME,
      dong:         ADMIN_DONG,
      roles:        ['ADMIN', 'COORDINATOR', 'PROVIDER', 'RECEIVER'],
      status:       'ACTIVE',
      memberType:   'INDIVIDUAL',
      tpBalance:    100,   // 초기 잔액
      lifetimeEarned: 100,
    },
  })

  console.log('✅ 관리자 계정 생성 완료')
  console.log('   ID:', member.id)
  console.log('   전화번호:', member.phone)
  console.log('   비밀번호:', ADMIN_PASSWORD)
  console.log('   역할:', member.roles.join(', '))
  console.log()
  console.log('👉 위 전화번호/비밀번호로 로그인하세요')
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => { console.error('❌ 오류:', e.message, e.code); prisma.$disconnect(); process.exit(1) })
