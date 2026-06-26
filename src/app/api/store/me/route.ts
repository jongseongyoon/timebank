export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// 로그인한 회원이 운영하는 착한가게 정보 (가게 QR 화면용)
export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const store = await prisma.goodStore.findFirst({
    where: { memberId: session.user.id },
    select: {
      id: true, storeName: true, ownerName: true, dong: true, category: true,
      status: true, onboardingStatus: true,
      cashBalance: true, totalReceived: true, totalSettled: true,
    },
  })

  if (!store) return NextResponse.json({ store: null })

  return NextResponse.json({
    store: {
      ...store,
      cashBalance: Number(store.cashBalance),
      totalReceived: Number(store.totalReceived),
      totalSettled: Number(store.totalSettled),
      qrValue: `goodstore:${store.id}`,
    },
  })
}
