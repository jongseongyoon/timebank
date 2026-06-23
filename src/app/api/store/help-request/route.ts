import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { requestType } = await request.json()
  if (!requestType) return NextResponse.json({ error: 'requestType 필요' }, { status: 400 })

  // 이 회원의 가게 찾기
  const store = await prisma.goodStore.findFirst({
    where: { memberId: session.user.id },
  })
  if (!store) return NextResponse.json({ error: '가게 정보 없음' }, { status: 404 })

  const helpReq = await prisma.storeHelpRequest.create({
    data: { storeId: store.id, requestType, status: 'PENDING' },
  })

  // 온보딩 상태 → NEEDS_HELP
  await prisma.goodStore.update({
    where: { id: store.id },
    data: { onboardingStatus: 'NEEDS_HELP' },
  })

  return NextResponse.json({ helpRequest: helpReq })
}
