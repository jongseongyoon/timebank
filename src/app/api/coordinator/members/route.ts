export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/** 전화번호 마스킹: 010-1234-5678 → 010-****-5678 */
function maskPhone(phone: string): string {
  return phone.replace(/(\d{2,3})-(\d{3,4})-(\d{4})/, '$1-****-$3')
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const isCoordinator = session.user.roles.some((r) => ['COORDINATOR', 'ADMIN'].includes(r))
  if (!isCoordinator) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const isAdmin = session.user.roles.includes('ADMIN')

  const { searchParams } = req.nextUrl
  const dong   = searchParams.get('dong') ?? session.user.dong
  const search = searchParams.get('search') ?? ''
  const role   = searchParams.get('role')
  // 관리자 전용: 전체 동(洞) 대상 + 전화번호 검색 (쿠폰 발급/TP 배분 등 동 경계를 넘는 작업용)
  const allDong = isAdmin && searchParams.get('all') === 'true'

  // 관리자는 이름·전화번호 모두로 검색 (전화번호 미마스킹 권한 보유), 코디네이터는 이름만
  const searchWhere = search
    ? (isAdmin
        ? { OR: [{ name: { contains: search } }, { phone: { contains: search } }] }
        : { name: { contains: search } })
    : {}

  const members = await prisma.member.findMany({
    where: {
      ...(allDong ? {} : { dong }),
      status: 'ACTIVE',
      ...searchWhere,
      ...(role ? { roles: { has: role as any } } : {}),
    },
    take: allDong ? 50 : undefined,
    select: {
      id: true,
      name: true,
      phone: true,
      dong: true,
      roles: true,
      isVulnerable: true,
      isDisabled: true,
      tpBalance: true,
      tpExpiresAt: true,
      createdAt: true,
      careLevel: true,
      careLevelUpdatedAt: true,
      avgRating: true,
      ratingCount: true,
    },
    orderBy: [
      { careLevel: 'desc' },
      { name: 'asc' },
    ],
  })

  // 코디네이터: 전화번호 마스킹, careLevel 숫자 제거(돌봄필요 여부만 노출)
  const sanitized = members.map(m => ({
    ...m,
    phone:     isAdmin ? m.phone : maskPhone(m.phone),
    careLevel: isAdmin ? m.careLevel : (m.careLevel != null && m.careLevel >= 1 ? m.careLevel : null),
  }))

  return NextResponse.json({ members: sanitized })
}
