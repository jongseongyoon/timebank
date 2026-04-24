import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const isCoordinator = session.user.roles.some((r) => ['COORDINATOR', 'ADMIN'].includes(r))
  if (!isCoordinator) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const tx = await prisma.transaction.findUnique({ where: { id: params.id } })
  if (!tx) return NextResponse.json({ error: '거래 없음' }, { status: 404 })
  if (tx.status !== 'PENDING') return NextResponse.json({ error: '취소 불가 상태' }, { status: 400 })

  const cancelled = await prisma.transaction.update({
    where: { id: params.id },
    data: { status: 'CANCELLED' },
  })

  return NextResponse.json({ transaction: cancelled })
}
