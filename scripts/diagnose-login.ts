import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const phone = '010-8839-0326'
  const password = 'Timebank2026'

  console.log('=== 로그인 진단 ===\n')

  // 1. 회원 조회
  const member = await prisma.member.findUnique({ where: { phone } })
  if (!member) {
    console.log('❌ 회원 없음. DB에 해당 전화번호가 없습니다.')
    return
  }

  console.log('✅ 회원 발견')
  console.log('  이름:', member.name)
  console.log('  전화번호:', member.phone)
  console.log('  상태:', member.status)
  console.log('  passwordHash 존재:', !!member.passwordHash)
  console.log('  passwordHash 앞부분:', member.passwordHash?.slice(0, 20))
  console.log()

  // 2. 상태 체크
  if (member.status === 'SUSPENDED') {
    console.log('❌ 계정 정지(SUSPENDED) 상태 — 로그인 불가')
  } else if (member.status === 'WITHDRAWN') {
    console.log('❌ 탈퇴(WITHDRAWN) 상태 — 로그인 불가')
  } else {
    console.log('✅ 계정 상태 정상:', member.status)
  }

  // 3. 비밀번호 체크
  if (!member.passwordHash) {
    console.log('❌ 비밀번호 해시 없음')
    return
  }

  const valid = await bcrypt.compare(password, member.passwordHash)
  console.log(`✅/❌ 비밀번호 일치: ${valid ? '✅ 일치' : '❌ 불일치'}`)

  if (!valid) {
    // 다른 가능한 비밀번호 시도
    const candidates = ['timebank2026', 'TIMEBANK2026', 'Timebank2026!', 'password123!', '12345678']
    for (const c of candidates) {
      const m = await bcrypt.compare(c, member.passwordHash)
      if (m) {
        console.log(`  → 실제 비밀번호는 "${c}" 인 것 같습니다`)
        break
      }
    }
    // 비밀번호 재설정
    const newHash = await bcrypt.hash(password, 12)
    await prisma.member.update({ where: { phone }, data: { passwordHash: newHash } })
    console.log(`\n🔑 비밀번호를 "${password}"로 강제 재설정 완료`)
  }

  // 4. auth.ts와 동일한 loginSchema 검증
  const phoneLen = phone.length
  const pwLen = password.length
  console.log(`\n  전화번호 길이: ${phoneLen} (최소 10)`)
  console.log(`  비밀번호 길이: ${pwLen} (최소 6)`)
  if (phoneLen < 10) console.log('❌ 전화번호가 너무 짧음')
  if (pwLen < 6) console.log('❌ 비밀번호가 너무 짧음')

  console.log('\n=== 진단 완료 ===')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
