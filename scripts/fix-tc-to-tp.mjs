/**
 * tc→tp 컬럼 데이터 마이그레이션 스크립트
 * - 기존 데이터 절대 삭제하지 않음
 * - tc* 컬럼 값을 tp* 컬럼으로 복사
 * - 없는 컬럼만 IF NOT EXISTS로 추가
 */
import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

async function columnExists(table, col) {
  const r = await p.$queryRawUnsafe(
    `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND column_name=$2`,
    table, col
  )
  return r.length > 0
}

async function addColIfMissing(table, col, def) {
  if (await columnExists(table, col)) {
    console.log(`  ✅ ${table}.${col} 이미 있음`)
  } else {
    await p.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${col}" ${def}`)
    console.log(`  ➕ ${table}.${col} 추가됨`)
  }
}

async function main() {
  console.log('=== tc→tp 데이터 마이그레이션 ===\n')

  // ── 1. Member: tcBalance → tpBalance ─────────────────────────────
  console.log('[1] Member 테이블')
  await addColIfMissing('Member', 'tpBalance', 'DECIMAL(10,2) NOT NULL DEFAULT 0')
  await addColIfMissing('Member', 'tpExpiresAt', 'TIMESTAMP(3)')

  const memberResult = await p.$executeRawUnsafe(`
    UPDATE "Member"
    SET "tpBalance" = "tcBalance"::DECIMAL(10,2)
    WHERE "tcBalance" IS NOT NULL
      AND "tcBalance"::DECIMAL(10,2) <> 0
  `)
  console.log(`  tpBalance ← tcBalance 복사 완료 (${memberResult}행)`)

  const expiryResult = await p.$executeRawUnsafe(`
    UPDATE "Member"
    SET "tpExpiresAt" = "tcExpiresAt"
    WHERE "tcExpiresAt" IS NOT NULL AND "tpExpiresAt" IS NULL
  `)
  console.log(`  tpExpiresAt ← tcExpiresAt 복사 완료 (${expiryResult}행)`)

  // lifetimeEarned / lifetimeSpent 는 기존 컬럼 이름 유지 (이미 올바른 값 있음)
  const lifetimeSample = await p.$queryRawUnsafe(
    `SELECT name, "tcBalance", "tpBalance", "lifetimeEarned", "lifetimeSpent" FROM "Member" ORDER BY "tpBalance" DESC LIMIT 5`
  )
  console.log('  잔액 샘플:', JSON.stringify(lifetimeSample))

  // ── 2. Transaction: tcAmount → tpAmount ──────────────────────────
  console.log('\n[2] Transaction 테이블')
  await addColIfMissing('Transaction', 'tpAmount', 'DECIMAL(10,2) NOT NULL DEFAULT 0')

  const txResult = await p.$executeRawUnsafe(`
    UPDATE "Transaction"
    SET "tpAmount" = "tcAmount"::DECIMAL(10,2)
    WHERE "tcAmount" IS NOT NULL
      AND "tcAmount"::DECIMAL(10,2) <> 0
  `)
  console.log(`  tpAmount ← tcAmount 복사 완료 (${txResult}행)`)

  const txSample = await p.$queryRawUnsafe(
    `SELECT "txType", "tcAmount", "tpAmount" FROM "Transaction" WHERE "tpAmount" > 0 LIMIT 5`
  )
  console.log('  금액 샘플:', JSON.stringify(txSample))

  // ── 3. Organization: tcBalance → tpBalance ───────────────────────
  console.log('\n[3] Organization 테이블')
  await addColIfMissing('Organization', 'tpBalance', 'DECIMAL(10,2) NOT NULL DEFAULT 0')
  await addColIfMissing('Organization', 'tpExpiresAt', 'TIMESTAMP(3)')

  const orgResult = await p.$executeRawUnsafe(`
    UPDATE "Organization"
    SET "tpBalance" = "tcBalance"::DECIMAL(10,2)
    WHERE "tcBalance" IS NOT NULL
      AND "tcBalance"::DECIMAL(10,2) <> 0
  `)
  console.log(`  tpBalance ← tcBalance 복사 완료 (${orgResult}행)`)

  const orgExpiry = await p.$executeRawUnsafe(`
    UPDATE "Organization"
    SET "tpExpiresAt" = "tcExpiresAt"
    WHERE "tcExpiresAt" IS NOT NULL AND "tpExpiresAt" IS NULL
  `)
  console.log(`  tpExpiresAt ← tcExpiresAt 복사 완료 (${orgExpiry}행)`)

  // ── 4. FundTransaction: tcEquivalent → tpEquivalent ─────────────
  console.log('\n[4] FundTransaction 테이블')
  await addColIfMissing('FundTransaction', 'tpEquivalent', 'DECIMAL(10,2) NOT NULL DEFAULT 0')

  const ftResult = await p.$executeRawUnsafe(`
    UPDATE "FundTransaction"
    SET "tpEquivalent" = "tcEquivalent"::DECIMAL(10,2)
    WHERE "tcEquivalent" IS NOT NULL
      AND "tcEquivalent"::DECIMAL(10,2) <> 0
  `)
  console.log(`  tpEquivalent ← tcEquivalent 복사 완료 (${ftResult}행)`)

  // ── 5. OrgTransaction: tcAmount → tpAmount ───────────────────────
  console.log('\n[5] OrgTransaction 테이블')
  await addColIfMissing('OrgTransaction', 'tpAmount', 'DECIMAL(10,2) NOT NULL DEFAULT 0')

  const otResult = await p.$executeRawUnsafe(`
    UPDATE "OrgTransaction"
    SET "tpAmount" = "tcAmount"::DECIMAL(10,2)
    WHERE "tcAmount" IS NOT NULL
      AND "tcAmount"::DECIMAL(10,2) <> 0
  `)
  console.log(`  tpAmount ← tcAmount 복사 완료 (${otResult}행)`)

  // ── 6. CarePackage: totalTcAmount/usedTcAmount → tp 컬럼 ─────────
  console.log('\n[6] CarePackage 테이블')
  const hasTotalTp = await columnExists('CarePackage', 'totalTpAmount')
  if (!hasTotalTp) {
    await p.$executeRawUnsafe(`ALTER TABLE "CarePackage" ADD COLUMN IF NOT EXISTS "totalTpAmount" DECIMAL(10,2) NOT NULL DEFAULT 0`)
    await p.$executeRawUnsafe(`ALTER TABLE "CarePackage" ADD COLUMN IF NOT EXISTS "usedTpAmount" DECIMAL(10,2) NOT NULL DEFAULT 0`)
    await p.$executeRawUnsafe(`UPDATE "CarePackage" SET "totalTpAmount" = "totalTcAmount"::DECIMAL(10,2), "usedTpAmount" = "usedTcAmount"::DECIMAL(10,2) WHERE "totalTcAmount" IS NOT NULL`)
    console.log('  ➕ totalTpAmount, usedTpAmount 추가 및 복사 완료')
  } else {
    console.log('  ✅ CarePackage tp 컬럼 이미 있음')
  }

  // ── 7. 최종 현황 ──────────────────────────────────────────────────
  console.log('\n=== 최종 현황 ===')
  const mc = await p.member.count()
  const tc = await p.transaction.count()
  const tpSum = await p.$queryRawUnsafe(`SELECT SUM("tpBalance"::DECIMAL) as total FROM "Member"`)
  const txSum = await p.$queryRawUnsafe(`SELECT SUM("tpAmount"::DECIMAL) as total FROM "Transaction"`)
  console.log(`  회원: ${mc}명, 거래: ${tc}건`)
  console.log(`  전체 tpBalance 합계: ${Number(tpSum[0].total ?? 0).toFixed(2)} TP`)
  console.log(`  전체 tpAmount 합계: ${Number(txSum[0].total ?? 0).toFixed(2)} TP`)
  console.log('\n✅ 마이그레이션 완료!')
}

main()
  .then(() => p.$disconnect())
  .catch(e => {
    console.error('\n❌ 오류:', e.message)
    p.$disconnect()
    process.exit(1)
  })
