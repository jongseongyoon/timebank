/**
 * POST /api/members/me/change-password
 * 로그인한 회원이 직접 비밀번호를 변경
 */
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as {
    currentPassword?: string
    newPassword?: string
  }

  const { currentPassword, newPassword } = body

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: '현재 비밀번호와 새 비밀번호를 모두 입력해주세요.' }, { status: 400 })
  }

  if (newPassword.length < 6) {
    return NextResponse.json({ error: '새 비밀번호는 6자 이상이어야 합니다.' }, { status: 400 })
  }

  if (newPassword.length > 100) {
    return NextResponse.json({ error: '비밀번호가 너무 깁니다.' }, { status: 400 })
  }

  // 현재 비밀번호 확인
  const member = await prisma.member.findUnique({
    where: { id: session.user.id },
    select: { id: true, passwordHash: true },
  })

  if (!member) return NextResponse.json({ error: '회원 없음' }, { status: 404 })

  if (!member.passwordHash) {
    return NextResponse.json({ error: '비밀번호가 설정되어 있지 않습니다. 관리자에게 문의하세요.' }, { status: 400 })
  }

  const isMatch = await bcrypt.compare(currentPassword, member.passwordHash)
  if (!isMatch) {
    return NextResponse.json({ error: '현재 비밀번호가 올바르지 않습니다.' }, { status: 400 })
  }

  // 새 비밀번호 해싱 후 저장
  const hashed = await bcrypt.hash(newPassword, 10)
  await prisma.member.update({
    where: { id: session.user.id },
    data: { passwordHash: hashed },
  })

  return NextResponse.json({ success: true })
}
