export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  title: z.string().min(2).max(100),
  content: z.string().min(1).max(3000),
  category: z.enum(['NOTICE', 'GENERAL', 'REVIEW', 'QUESTION']).default('GENERAL'),
})

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const category = searchParams.get('category')
  const page = Number(searchParams.get('page') ?? 1)
  const limit = Number(searchParams.get('limit') ?? 20)
  const skip = (page - 1) * limit

  const where = category && category !== 'ALL' ? { category: category as any } : {}

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: {
        author: { select: { id: true, name: true, dong: true, tcBalance: true, avgRating: true } },
        _count: { select: { comments: true } },
      },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.post.count({ where }),
  ])

  return NextResponse.json({ posts, total, page, limit })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  // 공지는 관리자만
  if (parsed.data.category === 'NOTICE') {
    const isAdmin = session.user.roles.includes('ADMIN')
    if (!isAdmin) return NextResponse.json({ error: '공지는 관리자만 작성 가능' }, { status: 403 })
  }

  const post = await prisma.post.create({
    data: {
      ...parsed.data,
      authorId: session.user.id,
    },
    include: {
      author: { select: { id: true, name: true, dong: true } },
    },
  })

  return NextResponse.json({ post }, { status: 201 })
}
