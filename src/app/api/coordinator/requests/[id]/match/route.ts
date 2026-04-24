import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({ providerId: z.string().uuid() })

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const isCoordinator = session.user.roles.some((r) => ['COORDINATOR', 'ADMIN'].includes(r))
  if (!isCoordinator) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const request = await prisma.serviceRequest.findUnique({ where: { id: params.id } })
  if (!request) return NextResponse.json({ error: '요청 없음' }, { status: 404 })
  if (request.status !== 'OPEN') return NextResponse.json({ error: '매칭 불가 상태' }, { status: 400 })

  const provider = await prisma.member.findUnique({ where: { id: parsed.data.providerId } })
  if (!provider || !provider.roles.includes('PROVIDER')) {
    return NextResponse.json({ error: '유효한 제공자 아님' }, { status: 400 })
  }

  const updated = await prisma.$transaction(async (trx) => {
    const req = await trx.serviceRequest.update({
      where: { id: params.id },
      data: {
        status: 'MATCHED',
        assignedProviderId: parsed.data.providerId,
        coordinatorId: session.user.id,
        matchedAt: new Date(),
      },
    })

    // 제공자·수요자 알림
    await Promise.all([
      trx.notification.create({
        data: {
          memberId: parsed.data.providerId,
          type: 'MATCH_REQUEST',
          title: '새 서비스 매칭',
          body: `${request.category} 서비스 요청이 배정되었습니다.`,
          link: `/services/requests/${params.id}`,
        },
      }),
      trx.notification.create({
        data: {
          memberId: request.requesterId,
          type: 'MATCH_REQUEST',
          title: '제공자 매칭 완료',
          body: '요청하신 서비스의 제공자가 연결되었습니다.',
          link: `/services/requests/${params.id}`,
        },
      }),
    ])

    return req
  })

  return NextResponse.json({ request: updated })
}
