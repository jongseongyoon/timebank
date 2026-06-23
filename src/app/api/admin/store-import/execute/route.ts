import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseStoreCsv, validateStoreRow, normalizePhone } from '@/lib/store-import'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user.roles?.includes('ADMIN')) {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  }

  const { csvText, skipWarnings } = await request.json()
  if (!csvText) return NextResponse.json({ error: 'csvText 필요' }, { status: 400 })

  const importedBy = session.user.id
  const rows = parseStoreCsv(csvText)

  const batch = await prisma.storeImportBatch.create({
    data: { importedBy, totalRows: rows.length, sourceFile: 'CSV' },
  })

  const results = { success: 0, error: 0, duplicate: 0, errors: [] as string[] }

  const BATCH_SIZE = 50
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE)

    for (const row of chunk) {
      try {
        const err = validateStoreRow(row)

        // 오류(비경고)는 건너뜀
        if (err && !err.startsWith('⚠️')) {
          results.error++
          results.errors.push(`행 ${row.rowIndex}: ${err}`)
          continue
        }

        // skipWarnings=true면 ⚠️ 경고 건도 건너뜀
        if (err?.startsWith('⚠️') && skipWarnings) {
          results.error++
          results.errors.push(`행 ${row.rowIndex}: ${err} → 보류`)
          continue
        }

        const phone = normalizePhone(row.phone)

        const existingStore = await prisma.goodStore.findUnique({ where: { phone } })
        if (existingStore) { results.duplicate++; continue }

        // 이미 일반 회원으로 가입된 경우 Member 재활용
        let memberId: string | undefined
        const existingMember = await prisma.member.findUnique({ where: { phone } })
        if (existingMember) {
          memberId = existingMember.id
        } else {
          const tempPassword = row.phone.replace(/\D/g, '').slice(-4)
          const hashedPw = await bcrypt.hash(tempPassword, 10)
          const member = await prisma.member.create({
            data: {
              name:        row.ownerName,
              phone,
              dong:        row.dong,
              roles:       ['PROVIDER'],
              passwordHash: hashedPw,
              memberType:  'ORGANIZATION',
              status:      'ACTIVE',
              syncSource:  'STORE_IMPORT',
            },
          })
          memberId = member.id
        }

        await prisma.goodStore.create({
          data: {
            storeName:       row.storeName,
            ownerName:       row.ownerName,
            phone,
            address:         row.address,
            dong:            row.dong,
            category:        row.category,
            bankName:        row.bankName,
            accountNo:       row.accountNo,
            accountHolder:   row.accountHolder,
            accountVerified: !err,
            memberId,
            status:          'ACTIVE',
            onboardingStatus: 'NOT_STARTED',
            registeredBy:    importedBy,
            importBatchId:   batch.id,
          },
        })

        results.success++
      } catch (e: unknown) {
        results.error++
        const msg = e instanceof Error ? e.message : '알 수 없는 오류'
        results.errors.push(`행 ${row.rowIndex}: ${msg}`)
      }
    }
  }

  await prisma.storeImportBatch.update({
    where: { id: batch.id },
    data: {
      successCount:   results.success,
      errorCount:     results.error,
      duplicateCount: results.duplicate,
      errorDetails:   results.errors,
    },
  })

  return NextResponse.json({ success: true, batchId: batch.id, results })
}
