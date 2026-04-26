export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  rating: z.number().int().min(1).max(5),
  review: z.string().max(200).optional(),
  // 건강 위기 별점 (제공자만 기록)
  healthRating: z.number().int().min(1).max(5).optional(),
  healthSituation: z.string().max(300).optional(),
  healthAction: z.string().max(300).optional(),
})

// 거래 완료 후 별점 제출
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { rating, review, healthRating, healthSituation, healthAction } = parsed.data
  const myId = session.user.id

  const tx = await prisma.transaction.findUnique({ where: { id: params.id } })
  if (!tx) return NextResponse.json({ error: '거래 없음' }, { status: 404 })
  if (tx.status !== 'APPROVED') return NextResponse.json({ error: '완료된 거래만 평가 가능' }, { status: 400 })

  const isProvider = tx.providerId === myId
  const isReceiver = tx.receiverId === myId
  if (!isProvider && !isReceiver) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  // 이미 평가했는지 확인
  if (isProvider && tx.providerRating) return NextResponse.json({ error: '이미 평가하셨습니다' }, { status: 400 })
  if (isReceiver && tx.receiverRating) return NextResponse.json({ error: '이미 평가하셨습니다' }, { status: 400 })

  // 건강 별점 3점 이상이면 상황/대책 필수 (제공자만)
  if (isProvider && healthRating && healthRating >= 3) {
    if (!healthSituation?.trim() || !healthAction?.trim()) {
      return NextResponse.json({
        error: '건강 이상 3점 이상 시 현재 상황과 필요 대책을 입력해야 합니다',
      }, { status: 400 })
    }
  }

  // 평가 대상 회원 (상대방)
  const targetId = isProvider ? tx.receiverId : tx.providerId
  if (!targetId) return NextResponse.json({ error: '평가 대상 없음' }, { status: 400 })

  // 거래 업데이트 + 대상 평균 별점 업데이트
  const [updatedTx, targetMember] = await prisma.$transaction(async (tx_) => {
    // 거래 데이터 업데이트
    const updateData: any = isProvider
      ? { providerRating: rating, providerReview: review }
      : { receiverRating: rating, receiverReview: review }

    // 건강 위기 별점은 제공자만 기록
    if (isProvider && healthRating) {
      updateData.healthRating = healthRating
      if (healthSituation) updateData.healthSituation = healthSituation
      if (healthAction) updateData.healthAction = healthAction
    }

    const updated = await tx_.transaction.update({
      where: { id: params.id },
      data: updateData,
    })

    const target = await tx_.member.findUnique({
      where: { id: targetId },
      select: { avgRating: true, ratingCount: true },
    })
    if (!target) throw new Error('대상 회원 없음')

    const oldCount = target.ratingCount
    const oldAvg = Number(target.avgRating)
    const newCount = oldCount + 1
    const newAvg = Math.round(((oldAvg * oldCount + rating) / newCount) * 100) / 100

    const updatedTarget = await tx_.member.update({
      where: { id: targetId },
      data: { avgRating: newAvg, ratingCount: newCount },
    })

    return [updated, updatedTarget]
  })

  return NextResponse.json({
    transaction: updatedTx,
    newAvgRating: Number(targetMember.avgRating),
  })
}
