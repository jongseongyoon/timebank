export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const post = await prisma.post.findUnique({
    where: { id: params.id },
    include: {
      author: { select: { id: true, name: true, dong: true, avgRating: true, tcBalance: true } },
      comments: {
        include: {
          author: { select: { id: true, name: true, dong: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
      likes: { select: { memberId: true } },
      _count: { select: { comments: true, likes: true } },
    },
  })

  if (!post) return NextResponse.json({ error: '게시글 없음' }, { status: 404 })

  // 조회수 증가
  await prisma.post.update({
    where: { id: params.id },
    data: { viewCount: { increment: 1 } },
  })

  const likedByMe = post.likes.some(l => l.memberId === session.user.id)

  return NextResponse.json({ post, likedByMe })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const post = await prisma.post.findUnique({ where: { id: params.id } })
  if (!post) return NextResponse.json({ error: '게시글 없음' }, { status: 404 })

  const isAdmin = session.user.roles.includes('ADMIN')
  if (post.authorId !== session.user.id && !isAdmin) {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  }

  await prisma.post.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
