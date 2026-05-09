import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PushSubscription" (
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
  console.log('✅ PushSubscription 테이블 생성(또는 이미 존재)')

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "PushSubscription_memberId_idx"
    ON "PushSubscription"("memberId")
  `)
  console.log('✅ 인덱스 생성 완료')
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); process.exit(1) })
