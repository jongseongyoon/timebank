export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import crypto from 'crypto'

const addSchema = z.object({
  providerId: z.string(),
  scheduledAt: z.string().datetime(),
  durationMinutes: z.number().int().min(15),
  tpAmount: z.number().positive(),
  note: z.string().max(300).optional(),
})

// 세션 목록
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const sessions = await prisma.careSession.findMany({
    where: { packageId: params.id },
    include: {
      provider: { select: { id: true, name: true, dong: true, tpBalance: true } },
      transaction: { select: { id: true, status: true, tpAmount: true } },
    },
    orderBy: { scheduledAt: 'asc' },
  })

  return NextResponse.json({ sessions })
}

// 세션 추가
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const isCoordOrAdmin = session.user.roles.some(r => ['COORDINATOR', 'ADMIN'].includes(r))
  if (!isCoordOrAdmin) return NextResponse.json({ error: '권한 필요' }, { status: 403 })

  const pkg = await prisma.carePackage.findUnique({
    where: { id: params.id },
    include: { sessions: true },
  })
  if (!pkg) return NextResponse.json({ error: '패키지 없음' }, { status: 404 })
  if (pkg.status !== 'ACTIVE') return NextResponse.json({ error: '활성 패키지만 세션 추가 가능' }, { status: 400 })

  const body = await req.json()

  // 여러 세션 일괄 추가 지원
  const items = Array.isArray(body) ? body : [body]

  const results = []
  for (const item of items) {
    const parsed = addSchema.safeParse(item)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    // 사용 TP 초과 검증
    const currentUsed = Number(pkg.usedTpAmount)
    const pendingUsed = pkg.sessions
      .filter(s => s.status === 'SCHEDULED')
      .reduce((sum, s) => sum + Number(s.tpAmount), 0)
    const available = Number(pkg.totalTpAmount) - currentUsed - pendingUsed

    if (parsed.data.tpAmount > available + 0.01) {
      return NextResponse.json({
        error: `TC 부족: 남은 TP ${available.toFixed(2)} TP (요청: ${parsed.data.tpAmount} TP)`
      }, { status: 400 })
    }

    const s = await prisma.careSession.create({
      data: {
        packageId: params.id,
        providerId: parsed.data.providerId,
        scheduledAt: new Date(parsed.data.scheduledAt),
        durationMinutes: parsed.data.durationMinutes,
        tpAmount: parsed.data.tpAmount,
        note: parsed.data.note,
        status: 'SCHEDULED',
      },
      include: {
        provider: { select: { id: true, name: true, dong: true } },
      },
    })
    results.push(s)
  }

  return NextResponse.json({ sessions: results }, { status: 201 })
}
