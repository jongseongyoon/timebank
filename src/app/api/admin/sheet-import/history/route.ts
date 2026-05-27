/**
 * GET /api/admin/sheet-import/history
 * 구글 시트 동기화 이력 최근 10건 반환
 */
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const isAdminOrCoord = session.user.roles.some((r: string) =>
    ['ADMIN', 'COORDINATOR'].includes(r)
  )
  if (!isAdminOrCoord) {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  }

  const history = await prisma.googleSheetSync.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      syncer: { select: { name: true } },
    },
  })

  return NextResponse.json({ history })
}
