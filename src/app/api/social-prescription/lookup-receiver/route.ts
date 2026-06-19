/**
 * GET /api/social-prescription/lookup-receiver?phone=010-0000-0000
 * 처방 대상자(기존 회원) 단건 조회 — 전화번호 정확 일치만 허용
 *
 * 처방자가 기존 회원에게 처방할 때 대상자를 특정하기 위한 용도.
 * 목록 열거를 막기 위해 검색·부분일치를 제공하지 않고 정확 일치 1건만 반환.
 */
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const allowed = session.user.roles.some((r) =>
    ['PRESCRIBER', 'ADMIN', 'COORDINATOR'].includes(r)
  )
  if (!allowed) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const phone = req.nextUrl.searchParams.get('phone')?.trim()
  if (!phone || !/^010-\d{4}-\d{4}$/.test(phone)) {
    return NextResponse.json({ error: '전화번호 형식: 010-0000-0000' }, { status: 400 })
  }

  const member = await prisma.member.findUnique({
    where:  { phone },
    select: { id: true, name: true, dong: true, status: true, careLevel: true },
  })

  if (!member) return NextResponse.json({ found: false })
  if (member.status === 'WITHDRAWN') {
    return NextResponse.json({ found: false, error: '탈퇴한 회원입니다.' })
  }

  return NextResponse.json({
    found: true,
    member: { id: member.id, name: member.name, dong: member.dong, careLevel: member.careLevel },
  })
}
