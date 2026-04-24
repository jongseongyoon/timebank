export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const schema = z.object({ content: z.string().min(1).max(500) })

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const post = await prisma.post.findUnique({ where: { id: params.id } })
  if (!post) return NextResponse.json({ error: '게시글 없음' }, { status: 404 })

  const comment = await prisma.comment.create({
    data: {
      postId: params.id,
      authorId: session.user.id,
      content: parsed.data.content,
    },
    include: { author: { select: { id: true, name: true, dong: true } } },
  })

  return NextResponse.json({ comment }, { status: 201 })
}
