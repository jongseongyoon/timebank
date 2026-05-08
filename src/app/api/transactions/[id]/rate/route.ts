export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({
  rating: z.number().int().min(1).max(5),
  review: z.string().max(200).optional(),
  // 돌봄 필요도 평가 (제공자만 기록)
  careLevel: z.number().int().min(1).max(5).optional(),
  careLevelTargetId: z.string().optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { rating, review, careLevel, careLevelTargetId } = parsed.data
  const myId = session.user.id

  const tx = await prisma.transaction.findUnique({ where: { id: params.id } })
  if (!tx) return NextResponse.json({ error: '거래 없음' }, { status: 404 })
  if (tx.status !== 'APPROVED') return NextResponse.json({ error: '완료된 거래만 평가 가능' }, { status: 400 })

  const isProvider = tx.providerId === myId
  const isReceiver = tx.receiverId === myId
  if (!isProvider && !isReceiver) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  if (isProvider && tx.providerRating) return NextResponse.json({ error: '이미 평가하셨습니다' }, { status: 400 })
  if (isReceiver && tx.receiverRating) return NextResponse.json({ error: '이미 평가하셨습니다' }, { status: 400 })

  const targetId = isProvider ? tx.receiverId : tx.providerId
  if (!targetId) return NextResponse.json({ error: '평가 대상 없음' }, { status: 400 })

  const [updatedTx, targetMember] = await prisma.$transaction(async (tx_) => {
    const updateData: any = isProvider
      ? { providerRating: rating, providerReview: review }
      : { receiverRating: rating, receiverReview: review }

    const updated = await tx_.transaction.update({
      where: { id: params.id },
      data: updateData,
    })

    // 대상 회원 평균 별점 업데이트
    const target = await tx_.member.findUnique({
      where: { id: targetId },
      select: { avgRating: true, ratingCount: true, careLevel: true },
    })
    if (!target) throw new Error('대상 회원 없음')

    const oldCount = target.ratingCount
    const oldAvg = Number(target.avgRating)
    const newCount = oldCount + 1
    const newAvg = Math.round(((oldAvg * oldCount + rating) / newCount) * 100) / 100

    const memberUpdateData: any = { avgRating: newAvg, ratingCount: newCount }

    // 제공자가 돌봄 필요도 평가한 경우 → Member.careLevel 업데이트
    if (isProvider && careLevel) {
      const effectiveTargetId = careLevelTargetId ?? targetId
      const prevLevel = target.careLevel ?? 1

      // CareLevelRecord 기록
      await tx_.careLevelRecord.create({
        data: {
          memberId: effectiveTargetId,
          assessedBy: myId,
          previousLevel: prevLevel,
          newLevel: careLevel,
          transactionId: params.id,
        },
      })

      // Member careLevel 업데이트
      memberUpdateData.careLevel = careLevel
      memberUpdateData.careLevelUpdatedAt = new Date()
    }

    const updatedTarget = await tx_.member.update({
      where: { id: targetId },
      data: memberUpdateData,
    })

    return [updated, updatedTarget]
  })

  return NextResponse.json({
    transaction: updatedTx,
    newAvgRating: Number(targetMember.avgRating),
    careLevel: targetMember.careLevel,
  })
}
