export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// 기존 회원 qrCode 자동 생성
export async function POST() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const member = await prisma.member.findUnique({
    where: { id: session.user.id },
    select: { id: true, qrCode: true },
  })
  if (!member) return NextResponse.json({ error: '회원 없음' }, { status: 404 })

  // 이미 있으면 그대로 반환
  if (member.qrCode) return NextResponse.json({ qrCode: member.qrCode })

  // 없으면 생성 후 저장
  const qrCode = `timepay:member:${member.id}`
  await prisma.member.update({
    where: { id: session.user.id },
    data: { qrCode },
  })

  return NextResponse.json({ qrCode })
}
