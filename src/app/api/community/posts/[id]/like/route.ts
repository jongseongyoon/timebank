export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const existing = await prisma.postLike.findUnique({
    where: { postId_memberId: { postId: params.id, memberId: session.user.id } },
  })

  if (existing) {
    // 좋아요 취소
    await prisma.$transaction([
      prisma.postLike.delete({ where: { id: existing.id } }),
      prisma.post.update({ where: { id: params.id }, data: { likeCount: { decrement: 1 } } }),
    ])
    return NextResponse.json({ liked: false })
  } else {
    // 좋아요
    await prisma.$transaction([
      prisma.postLike.create({ data: { postId: params.id, memberId: session.user.id } }),
      prisma.post.update({ where: { id: params.id }, data: { likeCount: { increment: 1 } } }),
    ])
    return NextResponse.json({ liked: true })
  }
}
