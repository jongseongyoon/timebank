export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({ reason: z.string().min(10).max(500) })

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const tx = await prisma.transaction.findUnique({ where: { id: params.id } })
  if (!tx) return NextResponse.json({ error: '거래 없음' }, { status: 404 })

  const isRelated = tx.providerId === session.user.id || tx.receiverId === session.user.id
  const isCoordinator = session.user.roles.some((r) => ['COORDINATOR', 'ADMIN'].includes(r))
  if (!isRelated && !isCoordinator) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  if (!['PENDING', 'APPROVED'].includes(tx.status)) {
    return NextResponse.json({ error: '분쟁 신고 불가 상태' }, { status: 400 })
  }

  const updated = await prisma.transaction.update({
    where: { id: params.id },
    data: { status: 'DISPUTED', note: parsed.data.reason },
  })

  return NextResponse.json({ transaction: updated })
}
