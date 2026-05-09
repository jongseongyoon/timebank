/**
 * 안전한 마이그레이션 스크립트
 * - 기존 데이터 절대 삭제하지 않음
 * - IF NOT EXISTS 로 없는 것만 추가
 * - 이미 있으면 그냥 스킵
 */
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function columnExists(table, column) {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = $1
      AND column_name  = $2
  `, table, column)
  return rows.length > 0
}

async function tableExists(table) {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = $1
  `, table)
  return rows.length > 0
}

async function addColumnIfMissing(table, column, definition) {
  if (await columnExists(table, column)) {
    console.log(`  ✅ [${table}.${column}] 이미 존재 — 스킵`)
  } else {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${column}" ${definition}`
    )
    console.log(`  ➕ [${table}.${column}] 추가 완료`)
  }
}

async function main() {
  console.log('=== 안전한 마이그레이션 시작 ===\n')

  // ── 1. Member 테이블 누락 컬럼 보완 ──────────────────────────────
  console.log('[1] Member 테이블 컬럼 확인')
  await addColumnIfMissing('Member', 'tpBalance',      'DECIMAL(10,2) NOT NULL DEFAULT 0')
  await addColumnIfMissing('Member', 'lifetimeEarned', 'DECIMAL(10,2) NOT NULL DEFAULT 0')
  await addColumnIfMissing('Member', 'lifetimeSpent',  'DECIMAL(10,2) NOT NULL DEFAULT 0')
  await addColumnIfMissing('Member', 'tpExpiresAt',    'TIMESTAMP(3)')
  await addColumnIfMissing('Member', 'avgRating',      'DECIMAL(3,2) NOT NULL DEFAULT 0')
  await addColumnIfMissing('Member', 'ratingCount',    'INTEGER NOT NULL DEFAULT 0')
  await addColumnIfMissing('Member', 'qrCode',         'TEXT')
  await addColumnIfMissing('Member', 'birthDate',      'TEXT')
  await addColumnIfMissing('Member', 'careLevel',      'INTEGER DEFAULT 1')
  await addColumnIfMissing('Member', 'careLevelUpdatedAt', 'TIMESTAMP(3)')
  await addColumnIfMissing('Member', 'careLevelNote',  'TEXT')

  // ── 2. Transaction 테이블 누락 컬럼 보완 ─────────────────────────
  console.log('\n[2] Transaction 테이블 컬럼 확인')
  await addColumnIfMissing('Transaction', 'tpAmount',  'DECIMAL(10,2) NOT NULL DEFAULT 0')
  await addColumnIfMissing('Transaction', 'baseRate',  'DECIMAL(6,4) NOT NULL DEFAULT 1')
  await addColumnIfMissing('Transaction', 'bonusRate', 'DECIMAL(10,2) NOT NULL DEFAULT 0')

  // ── 3. ServiceListing 테이블 누락 컬럼 보완 ──────────────────────
  console.log('\n[3] ServiceListing 테이블 컬럼 확인')
  await addColumnIfMissing('ServiceListing', 'tpPerHour', 'DECIMAL(6,4) NOT NULL DEFAULT 1')
  await addColumnIfMissing('ServiceListing', 'latitude',  'DOUBLE PRECISION')
  await addColumnIfMissing('ServiceListing', 'longitude', 'DOUBLE PRECISION')

  // ── 4. CareLevelRecord 테이블 생성 ───────────────────────────────
  console.log('\n[4] CareLevelRecord 테이블 확인')
  if (await tableExists('CareLevelRecord')) {
    console.log('  ✅ CareLevelRecord 이미 존재 — 스킵')
  } else {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "CareLevelRecord" (
        "id"            TEXT NOT NULL DEFAULT gen_random_uuid()::text,
        "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "memberId"      TEXT NOT NULL,
        "assessedBy"    TEXT NOT NULL,
        "previousLevel" INTEGER,
        "newLevel"      INTEGER NOT NULL,
        "note"          TEXT,
        "transactionId" TEXT,
        CONSTRAINT "CareLevelRecord_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "CareLevelRecord_memberId_fkey"
          FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT,
        CONSTRAINT "CareLevelRecord_assessedBy_fkey"
          FOREIGN KEY ("assessedBy") REFERENCES "Member"("id") ON DELETE RESTRICT
      )
    `)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CareLevelRecord_memberId_idx" ON "CareLevelRecord"("memberId")`)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "CareLevelRecord_assessedBy_idx" ON "CareLevelRecord"("assessedBy")`)
    console.log('  ➕ CareLevelRecord 테이블 생성 완료')
  }

  // ── 5. PushSubscription 테이블 생성 ──────────────────────────────
  console.log('\n[5] PushSubscription 테이블 확인')
  if (await tableExists('PushSubscription')) {
    console.log('  ✅ PushSubscription 이미 존재 — 스킵')
  } else {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "PushSubscription" (
        "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::text,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "memberId"  TEXT NOT NULL,
        "endpoint"  TEXT NOT NULL,
        "p256dh"    TEXT NOT NULL,
        "auth"      TEXT NOT NULL,
        "userAgent" TEXT,
        CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "PushSubscription_endpoint_key" UNIQUE ("endpoint"),
        CONSTRAINT "PushSubscription_memberId_fkey"
          FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE
      )
    `)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PushSubscription_memberId_idx" ON "PushSubscription"("memberId")`)
    console.log('  ➕ PushSubscription 테이블 생성 완료')
  }

  // ── 6. WalkRecord 테이블 확인 ─────────────────────────────────────
  console.log('\n[6] WalkRecord 테이블 확인')
  if (await tableExists('WalkRecord')) {
    console.log('  ✅ WalkRecord 이미 존재 — 스킵')
  } else {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "WalkRecord" (
        "id"         TEXT NOT NULL DEFAULT gen_random_uuid()::text,
        "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "memberId"   TEXT NOT NULL,
        "date"       TEXT NOT NULL,
        "steps"      INTEGER NOT NULL DEFAULT 0,
        "rewarded"   BOOLEAN NOT NULL DEFAULT false,
        "rewardTxId" TEXT,
        CONSTRAINT "WalkRecord_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "WalkRecord_memberId_date_key" UNIQUE ("memberId", "date"),
        CONSTRAINT "WalkRecord_memberId_fkey"
          FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT
      )
    `)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "WalkRecord_memberId_idx" ON "WalkRecord"("memberId")`)
    console.log('  ➕ WalkRecord 테이블 생성 완료')
  }

  // ── 최종 확인 ─────────────────────────────────────────────────────
  console.log('\n=== 최종 상태 확인 ===')
  const memberCount = await prisma.member.count()
  const txCount     = await prisma.transaction.count()
  console.log(`  회원: ${memberCount}명`)
  console.log(`  거래: ${txCount}건`)
  console.log('\n✅ 마이그레이션 완료 — 기존 데이터 보존됨')
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error('\n❌ 오류:', e.message)
    prisma.$disconnect()
    process.exit(1)
  })
