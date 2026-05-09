/**
 * tc* 구버전 컬럼에 DEFAULT 0 추가
 * NOT NULL 제약이 있는 구버전 컬럼에 DEFAULT를 달아줘서
 * 새 레코드 삽입 시 Null constraint 에러를 방지
 */
import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

async function setDefault(table, col, def = '0') {
  try {
    await p.$executeRawUnsafe(`ALTER TABLE "${table}" ALTER COLUMN "${col}" SET DEFAULT ${def}`)
    console.log(`  ✅ ${table}.${col} → DEFAULT ${def} 설정 완료`)
  } catch (e) {
    console.log(`  ⚠️  ${table}.${col}: ${e.message}`)
  }
}

async function dropNotNull(table, col) {
  try {
    await p.$executeRawUnsafe(`ALTER TABLE "${table}" ALTER COLUMN "${col}" DROP NOT NULL`)
    console.log(`  ✅ ${table}.${col} → NOT NULL 제약 제거 완료`)
  } catch (e) {
    console.log(`  ⚠️  ${table}.${col}: ${e.message}`)
  }
}

async function main() {
  console.log('=== tc* 구버전 컬럼 DEFAULT 추가 ===\n')

  // Transaction.tcAmount  (NOT NULL, 새 INSERT 시 null constraint 에러 발생)
  console.log('[Transaction]')
  await setDefault('Transaction', 'tcAmount', '0')

  // Member.tcBalance
  console.log('[Member]')
  await setDefault('Member', 'tcBalance', '0')
  // tcExpiresAt 은 nullable이므로 스킵

  // Organization.tcBalance
  console.log('[Organization]')
  await setDefault('Organization', 'tcBalance', '0')

  // OrgTransaction.tcAmount
  console.log('[OrgTransaction]')
  await setDefault('OrgTransaction', 'tcAmount', '0')

  // FundTransaction.tcEquivalent
  console.log('[FundTransaction]')
  await setDefault('FundTransaction', 'tcEquivalent', '0')

  // CarePackage: totalTcAmount, usedTcAmount
  console.log('[CarePackage]')
  await setDefault('CarePackage', 'totalTcAmount', '0')
  await setDefault('CarePackage', 'usedTcAmount', '0')

  console.log('\n✅ 완료! 이제 새 레코드 삽입 시 tc* 컬럼은 자동으로 0으로 설정됩니다.')
}

main().then(() => p.$disconnect()).catch(e => { console.error('FATAL:', e.message); p.$disconnect() })
