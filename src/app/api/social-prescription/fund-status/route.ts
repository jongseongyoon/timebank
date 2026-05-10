/**
 * GET /api/social-prescription/fund-status
 * 사회적처방 기금 현황 조회 (로그인 불필요 — 투명성 공개용)
 */
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getSocialPrescriptionFundStatus } from '@/lib/social-prescription'

export async function GET() {
  try {
    const status = await getSocialPrescriptionFundStatus()
    return NextResponse.json(status)
  } catch (err: any) {
    console.error('[GET /api/social-prescription/fund-status]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
