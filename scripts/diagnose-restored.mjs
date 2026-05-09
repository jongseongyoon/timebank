import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function allCols(table) {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, column_default
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name=$1
    ORDER BY ordinal_position
  `, table)
  return rows.map(r => r.column_name)
}

async function tableExists(t) {
  const r = await prisma.$queryRawUnsafe(
    `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`, t)
  return r.length > 0
}

async function enumValues(enumName) {
  const r = await prisma.$queryRawUnsafe(
    `SELECT enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid WHERE t.typname=$1 ORDER BY e.enumsortorder`, enumName)
  return r.map(x => x.enumlabel)
}

async function main() {
  console.log('\n=== 복구된 DB 진단 ===\n')

  // 1. Member 컬럼
  const memberCols = await allCols('Member')
  console.log('[Member] 컬럼:', memberCols.join(', '))
  const hasTpBalance = memberCols.includes('tpBalance')
  const hasTcBalance = memberCols.includes('tcBalance')
  const hasLifetimeEarned = memberCols.includes('lifetimeEarned')
  const hasTotalEarned = memberCols.includes('totalEarned')
  console.log(`  tpBalance: ${hasTpBalance ? '✅' : '❌'}  tcBalance: ${hasTcBalance ? '있음' : '없음'}`)
  console.log(`  lifetimeEarned: ${hasLifetimeEarned ? '✅' : '❌'}  totalEarned: ${hasTotalEarned ? '있음' : '없음'}`)

  // Member 샘플 잔액
  const sample = await prisma.$queryRawUnsafe(`SELECT name, "tpBalance" FROM "Member" LIMIT 5`)
  console.log('  tpBalance 샘플:', sample)

  // 2. Transaction 컬럼
  const txCols = await allCols('Transaction')
  console.log('\n[Transaction] 컬럼:', txCols.join(', '))
  const hasTpAmount = txCols.includes('tpAmount')
  const hasTcAmount = txCols.includes('tcAmount')
  console.log(`  tpAmount: ${hasTpAmount ? '✅' : '❌'}  tcAmount: ${hasTcAmount ? '있음(구버전)' : '없음'}`)

  // Transaction 샘플 금액
  const txSample = await prisma.$queryRawUnsafe(`SELECT "txType", "tpAmount" FROM "Transaction" LIMIT 5`)
  console.log('  tpAmount 샘플:', txSample)

  // 3. Organization 컬럼
  const orgCols = await allCols('Organization')
  console.log('\n[Organization] 컬럼:', orgCols.join(', '))

  // 4. 테이블 존재 여부
  console.log('\n[테이블 존재 여부]')
  for (const t of ['FundTransaction','OrgTransaction','CarePackage','CareSession','CareLevelRecord','PushSubscription','WalkRecord']) {
    console.log(`  ${t}: ${await tableExists(t) ? '✅' : '❌ 없음'}`)
  }

  // 5. Enum 값 확인
  console.log('\n[TxType enum 값]')
  const txTypeVals = await enumValues('TxType')
  console.log(' ', txTypeVals.join(', '))
  console.log('[VerificationMethod enum]')
  const vmVals = await enumValues('VerificationMethod')
  console.log(' ', vmVals.join(', '))

  // 6. 회원 수 및 잔액 합계
  console.log('\n[현황]')
  const mc = await prisma.member.count()
  const tc = await prisma.transaction.count()
  console.log(`  회원 ${mc}명, 거래 ${tc}건`)
}

main().then(() => prisma.$disconnect()).catch(e => { console.error('❌', e.message); process.exit(1) })
