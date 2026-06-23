import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const coupons = await prisma.goodCoupon.findMany({
    where: { receiverId: session.user.id, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
    include: {
      transactions: {
        where: { status: 'APPROVED' },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { store: { select: { storeName: true } } },
      },
    },
  })

  return NextResponse.json({ coupons })
}
