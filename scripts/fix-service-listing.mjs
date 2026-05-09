import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

async function main() {
  // ServiceListing tcPerHour → tpPerHour
  const listings = await p.$queryRawUnsafe(`SELECT id, title, "tcPerHour", "tpPerHour" FROM "ServiceListing" LIMIT 20`)
  console.log('ServiceListing 현재 값:', JSON.stringify(listings))

  // tcPerHour가 있으면 복사
  const r = await p.$executeRawUnsafe(`
    UPDATE "ServiceListing"
    SET "tpPerHour" = "tcPerHour"::DECIMAL(6,4)
    WHERE "tcPerHour" IS NOT NULL AND "tcPerHour"::DECIMAL > 0
  `)
  console.log(`tcPerHour → tpPerHour 복사: ${r}행`)

  const after = await p.$queryRawUnsafe(`SELECT id, title, "tcPerHour", "tpPerHour" FROM "ServiceListing" LIMIT 20`)
  console.log('복사 후:', JSON.stringify(after))
}

main().then(() => p.$disconnect()).catch(e => { console.error(e.message); p.$disconnect() })
