import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

async function cols(table) {
  const r = await p.$queryRawUnsafe(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`, table)
  return r.map(x => x.column_name)
}

async function main() {
  for (const t of ['FundTransaction','ServiceListing','AuditLog','OrgTransaction','CarePackage']) {
    const c = await cols(t)
    console.log(`[${t}] ${c.join(', ')}`)
  }

  // Check Transaction tcAmount values
  const txSum = await p.$queryRawUnsafe(`SELECT COUNT(*) as cnt, SUM("tcAmount"::numeric) as total FROM "Transaction"`)
  console.log('\nTransaction tcAmount total:', JSON.stringify(txSum))

  // Member tcBalance sum
  const mSum = await p.$queryRawUnsafe(`SELECT SUM("tcBalance"::numeric) as total FROM "Member"`)
  console.log('Member tcBalance total:', JSON.stringify(mSum))
}

main().then(() => p.$disconnect()).catch(e => { console.error(e.message); p.$disconnect() })
