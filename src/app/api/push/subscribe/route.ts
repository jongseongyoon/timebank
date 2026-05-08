import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/push/subscribe — 구독 등록/갱신
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: '로그인 필요' }, { status: 401 })
  }

  let body: { endpoint: string; keys: { p256dh: string; auth: string } }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청' }, { status: 400 })
  }

  const { endpoint, keys } = body
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: '구독 정보 누락' }, { status: 400 })
  }

  const userAgent = req.headers.get('user-agent') ?? undefined

  // upsert: endpoint가 같으면 갱신, 없으면 생성
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: {
      memberId: session.user.id,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent,
    },
    create: {
      memberId: session.user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent,
    },
  })

  return NextResponse.json({ ok: true })
}

// DELETE /api/push/subscribe — 구독 해제
export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: '로그인 필요' }, { status: 401 })
  }

  let body: { endpoint: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청' }, { status: 400 })
  }

  await prisma.pushSubscription.deleteMany({
    where: { endpoint: body.endpoint, memberId: session.user.id },
  })

  return NextResponse.json({ ok: true })
}
