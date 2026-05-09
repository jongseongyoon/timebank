/**
 * 일괄 배분 API가 실제로 하는 작업을 직접 실행해서 에러 확인
 */
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'
const p = new PrismaClient()

async function main() {
  // 1. TxStatus enum 값 확인
  const txStatus = await p.$queryRawUnsafe(
    `SELECT enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid WHERE t.typname='TxStatus' ORDER BY e.enumsortorder`
  )
  console.log('[TxStatus enum]', txStatus.map(x => x.enumlabel).join(', '))

  // 2. 실제 admin 계정 찾기
  const admin = await p.member.findFirst({
    where: { roles: { has: 'ADMIN' } },
    select: { id: true, name: true, phone: true },
  })
  console.log('[Admin]', admin)
  if (!admin) throw new Error('관리자 계정 없음')

  // 3. 대상 회원 찾기 (첫 번째 일반 회원)
  const target = await p.member.findFirst({
    where: { id: { not: admin.id } },
    select: { id: true, name: true, phone: true, tpBalance: true },
  })
  console.log('[대상 회원]', target)
  if (!target) throw new Error('대상 회원 없음')

  // 4. Transaction.create 단독 테스트
  console.log('\n[TEST] Transaction.create 단독 실행...')
  const txHash = crypto.createHash('sha256')
    .update(`test-${admin.id}-1-${Date.now()}-${Math.random()}`)
    .digest('hex')

  try {
    const tx = await p.transaction.create({
      data: {
        txType: 'FREE_ALLOCATION',
        status: 'APPROVED',
        verificationMethod: 'COORDINATOR',
        durationMinutes: 0,
        tpAmount: 1,
        baseRate: 0,
        bonusRate: 0,
        txHash,
        note: '테스트 배분',
        coordinatorId: admin.id,
        receiverId: target.id,
        completedAt: new Date(),
      },
    })
    console.log('✅ Transaction.create 성공:', tx.id)

    // 생성한 테스트 트랜잭션 즉시 삭제 (데이터 오염 방지)
    await p.$executeRawUnsafe(`DELETE FROM "Transaction" WHERE id = $1`, tx.id)
    console.log('   (테스트 트랜잭션 삭제됨)')
  } catch (e) {
    console.error('❌ Transaction.create 실패:', e.message)
    console.error('   상세:', e.code, e.meta)
  }

  // 5. Member.update 단독 테스트 (실제 변경 없이 0 increment)
  console.log('\n[TEST] Member.update tpBalance increment 테스트...')
  try {
    await p.member.update({
      where: { id: target.id },
      data: {
        tpBalance: { increment: 0 },
        lifetimeEarned: { increment: 0 },
      },
    })
    console.log('✅ Member.update 성공')
  } catch (e) {
    console.error('❌ Member.update 실패:', e.message)
    console.error('   상세:', e.code, e.meta)
  }

  // 6. AuditLog.create 테스트
  console.log('\n[TEST] AuditLog.create 테스트...')
  try {
    const log = await p.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'BULK_ALLOCATE_TEST',
        details: JSON.stringify({ count: 1, results: [] }),
      },
    })
    console.log('✅ AuditLog.create 성공:', log.id)
    await p.$executeRawUnsafe(`DELETE FROM "AuditLog" WHERE id = $1`, log.id)
    console.log('   (테스트 로그 삭제됨)')
  } catch (e) {
    console.error('❌ AuditLog.create 실패:', e.message)
    console.error('   상세:', e.code, e.meta)
  }

  // 7. $transaction 배치 테스트
  console.log('\n[TEST] prisma.$transaction([create, update]) 배치 테스트...')
  const txHash2 = crypto.createHash('sha256')
    .update(`test2-${admin.id}-1-${Date.now()}-${Math.random()}`)
    .digest('hex')
  try {
    const [created] = await p.$transaction([
      p.transaction.create({
        data: {
          txType: 'FREE_ALLOCATION',
          status: 'APPROVED',
          verificationMethod: 'COORDINATOR',
          durationMinutes: 0,
          tpAmount: 1,
          baseRate: 0,
          bonusRate: 0,
          txHash: txHash2,
          note: '배치 테스트',
          coordinatorId: admin.id,
          receiverId: target.id,
          completedAt: new Date(),
        },
      }),
      p.member.update({
        where: { id: target.id },
        data: {
          tpBalance: { increment: 1 },
          lifetimeEarned: { increment: 1 },
        },
      }),
    ])
    console.log('✅ $transaction 배치 성공:', created.id)

    // 롤백: 생성된 거래 삭제 + 잔액 복구
    await p.$transaction([
      p.$executeRawUnsafe(`DELETE FROM "Transaction" WHERE id = $1`, created.id),
      p.member.update({ where: { id: target.id }, data: { tpBalance: { decrement: 1 }, lifetimeEarned: { decrement: 1 } } }),
    ])
    console.log('   (테스트 데이터 복구됨)')
  } catch (e) {
    console.error('❌ $transaction 배치 실패:', e.message)
    console.error('   상세:', e.code, e.meta)
    if (e.cause) console.error('   원인:', e.cause)
  }
}

main().then(() => p.$disconnect()).catch(e => { console.error('FATAL:', e.message); p.$disconnect() })
