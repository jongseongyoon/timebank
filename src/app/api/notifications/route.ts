export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// 내 알림 목록
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const notifications = await prisma.notification.findMany({
    where: { memberId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return NextResponse.json({ notifications })
}

// 읽음 처리 (PATCH /api/notifications?id=xxx 또는 all=true)
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const id = searchParams.get('id')
  const all = searchParams.get('all') === 'true'

  if (all) {
    await prisma.notification.updateMany({
      where: { memberId: session.user.id, isRead: false },
      data: { isRead: true },
    })
    return NextResponse.json({ ok: true })
  }

  if (id) {
    await prisma.notification.updateMany({
      where: { id, memberId: session.user.id },
      data: { isRead: true },
    })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: '잘못된 요청' }, { status: 400 })
}
