import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()

async function cols(table) {
  const r = await p.$queryRawUnsafe(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`, table)
  return r.map(x => x.column_name)
}
async function tableExists(t) {
  const r = await p.$queryRawUnsafe(`SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`, t)
  return r.length > 0
}

async function main() {
  console.log('FundTransaction cols:', (await cols('FundTransaction')).join(', '))
  console.log('AuditLog exists:', await tableExists('AuditLog'))
  console.log('Organization cols:', (await cols('Organization')).join(', '))

  const orgs = await p.$queryRawUnsafe('SELECT id, name, "tcBalance" FROM "Organization" LIMIT 5')
  console.log('Organization sample:', JSON.stringify(orgs))

  const members = await p.$queryRawUnsafe('SELECT name, "tcBalance", "tpBalance", "lifetimeEarned", "lifetimeSpent" FROM "Member" LIMIT 8')
  console.log('Member balances:', JSON.stringify(members))

  const txs = await p.$queryRawUnsafe('SELECT "txType", "tcAmount", "tpAmount" FROM "Transaction" LIMIT 8')
  console.log('Transaction amounts:', JSON.stringify(txs))
}

main().then(() => p.$disconnect()).catch(e => { console.error(e.message); p.$disconnect() })
