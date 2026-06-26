export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

// 100,000원 = 9.69 TP (내부 환산비, 관리자 회계용)
const KRW_PER_TP = 100000 / 9.69

type CouponRow = {
  phone: string
  name: string
  cashAmount: number
  validDays: number
  reason: string
}

function genCouponNo() {
  const d = new Date()
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase()
  return `GC-${ymd}-${rand}`
}

// 엑셀 일괄 쿠폰 발급
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  if (!session.user.roles.includes('ADMIN')) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const body = await req.json()
  const rows: CouponRow[] = body.rows
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: '데이터 없음' }, { status: 400 })
  }

  const results: { phone: string; name: string; cashAmount: number; status: 'success' | 'error'; reason: string }[] = []

  for (const row of rows) {
    try {
      if (!(row.cashAmount > 0)) {
        results.push({ ...row, status: 'error', reason: '금액 오류' })
        continue
      }
      const member = await prisma.member.findUnique({ where: { phone: row.phone } })
      if (!member) {
        results.push({ ...row, status: 'error', reason: '미등록 회원' })
        continue
      }

      const validDays = row.validDays > 0 ? row.validDays : 365
      const internalTpValue = Math.round((row.cashAmount / KRW_PER_TP) * 100) / 100
      const validFrom = new Date()
      const validUntil = new Date(validFrom.getTime() + validDays * 24 * 60 * 60 * 1000)

      const coupon = await prisma.goodCoupon.create({
        data: {
          couponNo: genCouponNo(),
          receiverId: member.id,
          issuedBy: session.user.id,
          cashAmount: row.cashAmount,
          cashRemaining: row.cashAmount,
          internalTpValue,
          validFrom,
          validUntil,
          prescriptionReason: row.reason || '일괄 발급',
          status: 'ACTIVE',
          fundSource: 'ADMIN',
        },
      })

      results.push({ phone: row.phone, name: member.name, cashAmount: row.cashAmount, status: 'success', reason: coupon.couponNo })
    } catch {
      results.push({ ...row, status: 'error', reason: '처리 오류' })
    }
  }

  await prisma.auditLog.create({
    data: {
      adminId: session.user.id,
      action: 'BULK_COUPON_ISSUE',
      details: JSON.stringify({ count: rows.length, results }),
    },
  })

  return NextResponse.json({ results })
}
