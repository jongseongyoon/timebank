import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user.roles?.some(r => ['COORDINATOR','ADMIN'].includes(r))) {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') ?? 'PENDING'

  const items = await prisma.storeHelpRequest.findMany({
    where: status === 'all' ? {} : { status },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      store: { select: { storeName: true, phone: true, dong: true } },
      coordinator: { select: { name: true } },
    },
  })

  return NextResponse.json({ items })
}

export async function PATCH(request: NextRequest) {
  const session = await auth()
  if (!session?.user.roles?.some(r => ['COORDINATOR','ADMIN'].includes(r))) {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  }

  const { id, action, note } = await request.json()

  const updated = await prisma.storeHelpRequest.update({
    where: { id },
    data: {
      status:        action === 'resolve' ? 'RESOLVED' : 'CALLED',
      coordinatorId: session.user.id,
      resolvedAt:    action === 'resolve' ? new Date() : undefined,
      note:          note ?? undefined,
    },
  })

  if (action === 'resolve') {
    await prisma.goodStore.update({
      where: { id: updated.storeId },
      data: { onboardingStatus: 'ACTIVE' },
    })
  }

  return NextResponse.json({ helpRequest: updated })
}
