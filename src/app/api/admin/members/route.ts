/**
 * GET /api/admin/members
 * 회원 목록 (검색·필터·페이지네이션)
 */
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Role, MemberStatus, Prisma } from '@prisma/client'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  const allowed = session.user.roles.some((r: string) => ['ADMIN', 'COORDINATOR'].includes(r))
  if (!allowed) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const sp     = req.nextUrl.searchParams
  const search = sp.get('search')?.trim() ?? ''
  const dong   = sp.get('dong')   ?? ''
  const role   = sp.get('role')   ?? ''
  const status = sp.get('status') ?? ''
  const page   = Math.max(1, parseInt(sp.get('page')  ?? '1'))
  const limit  = Math.min(50, parseInt(sp.get('limit') ?? '20'))

  const where: Prisma.MemberWhereInput = {}

  if (search) {
    where.OR = [
      { name:  { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
    ]
  }
  if (dong)   where.dong   = dong
  if (role && Object.values(Role).includes(role as Role))
    where.roles = { has: role as Role }
  if (status && Object.values(MemberStatus).includes(status as MemberStatus))
    where.status = status as MemberStatus

  const [members, total] = await Promise.all([
    prisma.member.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip:    (page - 1) * limit,
      take:    limit,
      select: {
        id: true, name: true, phone: true, dong: true,
        roles: true, status: true, memberType: true,
        tpBalance: true, createdAt: true, syncSource: true,
      },
    }),
    prisma.member.count({ where }),
  ])

  return NextResponse.json({ members, total, page, limit })
}
