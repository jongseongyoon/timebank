import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// 내 활성 사회적처방 (서비스 찾기 화면에서 카드 내 안내 표시용)
export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ prescription: null })

  const rx = await prisma.socialPrescription.findFirst({
    where: { receiverId: session.user.id, status: 'ACTIVE' },
    orderBy: { approvedAt: 'desc' },
    include: {
      coordinator: { select: { name: true } },
    },
  })

  if (!rx) return NextResponse.json({ prescription: null })

  return NextResponse.json({
    prescription: {
      prescriptionNo:     rx.prescriptionNo,
      recommendedServices: rx.recommendedServices,
      totalTpGranted:     Number(rx.totalTpGranted),
      tpUsed:             Number(rx.tpUsed),
      tpRemaining:        Number(rx.totalTpGranted) - Number(rx.tpUsed),
      validUntil:         rx.validUntil,
      coordinatorName:    rx.coordinator?.name ?? null,
    },
  })
}
