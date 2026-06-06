/**
 * POST /api/admin/members/[id]/reset-password
 * 비밀번호를 생년월일 6자리(YYMMDD)로 초기화 (ADMIN 전용)
 */
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  if (!session.user.roles.includes('ADMIN')) {
    return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 })
  }

  const member = await prisma.member.findUnique({
    where:  { id: params.id },
    select: { id: true, name: true, birthDate: true },
  })
  if (!member) return NextResponse.json({ error: '회원 없음' }, { status: 404 })

  if (!member.birthDate || member.birthDate.length < 8) {
    return NextResponse.json(
      { error: '생년월일 정보가 없어 초기화할 수 없습니다.' },
      { status: 400 },
    )
  }

  // 임시 비밀번호: 생년월일 6자리 (YYYYMMDD → YYMMDD, index 2~7)
  const tempPw = member.birthDate.slice(2, 8)  // e.g. '19450315' → '450315'
  const hashed = await bcrypt.hash(tempPw, 10)

  await prisma.member.update({
    where: { id: params.id },
    data:  { passwordHash: hashed },
  })

  await prisma.auditLog.create({
    data: {
      adminId:  session.user.id,
      action:   'PASSWORD_RESET',
      targetId: params.id,
      details:  JSON.stringify({ memberName: member.name }),
    },
  })

  return NextResponse.json({ success: true })
}
