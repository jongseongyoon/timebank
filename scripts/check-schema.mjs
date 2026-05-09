import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function cols(table) {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position
  `, table)
  return rows.map(r => r.column_name)
}

async function main() {
  const tables = [
    'Member', 'ServiceListing', 'Transaction', 'WalkRecord',
    'ServiceRequest', 'Notification', 'PushSubscription', 'CareLevelRecord'
  ]

  for (const t of tables) {
    const c = await cols(t)
    console.log(`\n[${t}] (${c.length}개)`)
    console.log(' ', c.join(', '))
  }

  // 핵심 쿼리 직접 테스트
  console.log('\n=== 쿼리 테스트 ===')
  try {
    await prisma.serviceListing.findMany({ take: 1 })
    console.log('✅ serviceListing.findMany OK')
  } catch(e) { console.log('❌ serviceListing.findMany:', e.message) }

  try {
    await prisma.transaction.findMany({ take: 1 })
    console.log('✅ transaction.findMany OK')
  } catch(e) { console.log('❌ transaction.findMany:', e.message) }

  try {
    await prisma.walkRecord.findMany({ take: 1 })
    console.log('✅ walkRecord.findMany OK')
  } catch(e) { console.log('❌ walkRecord.findMany:', e.message) }

  try {
    await prisma.notification.findMany({ take: 1 })
    console.log('✅ notification.findMany OK')
  } catch(e) { console.log('❌ notification.findMany:', e.message) }
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => { console.error('❌ 치명적 오류:', e.message); process.exit(1) })
