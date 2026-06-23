import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseAndValidate, normalizePhone } from '@/lib/store-import'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user.roles?.includes('ADMIN')) {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  }

  const { csvText } = await request.json()
  if (!csvText) return NextResponse.json({ error: 'csvText 필요' }, { status: 400 })

  const rows = parseAndValidate(csvText)

  // 기존 전화번호 중복 확인 (DB 조회)
  const phones = rows.map(r => normalizePhone(r.phone)).filter(Boolean)
  const existing = await prisma.goodStore.findMany({
    where: { phone: { in: phones } },
    select: { phone: true },
  })
  const existingSet = new Set(existing.map(e => e.phone))

  const preview = rows.map(row => {
    const phone = normalizePhone(row.phone)
    const isDuplicate = existingSet.has(phone)
    const err = row.validationError

    let statusCode: 'ok' | 'warn' | 'error' | 'duplicate'
    if (isDuplicate) statusCode = 'duplicate'
    else if (err && !err.startsWith('⚠️')) statusCode = 'error'
    else if (err?.startsWith('⚠️')) statusCode = 'warn'
    else statusCode = 'ok'

    return {
      rowIndex:     row.rowIndex,
      storeName:    row.storeName,
      phone:        row.normalizedPhone,
      dong:         row.dong,
      ownerName:    row.ownerName,
      statusCode,
      message: isDuplicate ? '이미 등록됨' : (err ?? '정상'),
    }
  })

  const counts = preview.reduce(
    (acc, r) => { acc[r.statusCode]++; return acc },
    { ok: 0, warn: 0, error: 0, duplicate: 0 },
  )

  return NextResponse.json({ preview, counts, total: rows.length })
}
