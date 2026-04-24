export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  targetType: z.enum(['ALL', 'DONG', 'INDIVIDUAL']),
  targetDong: z.string().optional(),
  targetMemberId: z.string().uuid().optional(),
  link: z.string().optional(),
})

// 알림 발송
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  if (!session.user.roles.includes('ADMIN')) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { title, body: msgBody, targetType, targetDong, targetMemberId, link } = parsed.data

  let memberIds: string[] = []

  if (targetType === 'ALL') {
    const members = await prisma.member.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true },
    })
    memberIds = members.map(m => m.id)
  } else if (targetType === 'DONG' && targetDong) {
    const members = await prisma.member.findMany({
      where: { dong: targetDong, status: 'ACTIVE' },
      select: { id: true },
    })
    memberIds = members.map(m => m.id)
  } else if (targetType === 'INDIVIDUAL' && targetMemberId) {
    memberIds = [targetMemberId]
  }

  if (memberIds.length === 0) {
    return NextResponse.json({ error: '발송 대상 없음' }, { status: 400 })
  }

  // DB에 알림 저장
  await prisma.notification.createMany({
    data: memberIds.map(memberId => ({
      memberId,
      type: 'ADMIN_PUSH',
      title,
      body: msgBody,
      link: link ?? '/',
    })),
  })

  return NextResponse.json({ sent: memberIds.length })
}

// 알림 내역 조회
export async function GET(_req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  if (!session.user.roles.includes('ADMIN')) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const logs = await prisma.auditLog.findMany({
    where: { action: { in: ['TC_ALLOCATE', 'BULK_ALLOCATE', 'TRANSACTION_DELETE', 'TRANSACTION_EDIT'] } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  // 최근 발송된 알림 수 집계
  const recentNotifications = await prisma.notification.groupBy({
    by: ['title'],
    _count: true,
    orderBy: { _count: { title: 'desc' } },
    take: 10,
  })

  return NextResponse.json({ logs, recentNotifications })
}
