export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// QR 스캔 후 상대방 정보 조회
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const member = await prisma.member.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      dong: true,
      tcBalance: true,
      avgRating: true,
      ratingCount: true,
      roles: true,
      status: true,
    },
  })

  if (!member) return NextResponse.json({ error: '회원 없음' }, { status: 404 })
  if (member.status !== 'ACTIVE') return NextResponse.json({ error: '비활성 회원' }, { status: 400 })
  if (member.id === session.user.id) return NextResponse.json({ error: '자기 자신과 거래 불가' }, { status: 400 })

  return NextResponse.json({ member })
}
