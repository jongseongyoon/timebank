/**
 * GET /api/monitoring/followups
 * 전체 인물의 미해결/기한임박 조치 모음 (명령서 §3.2.5)
 */
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireStaff, logAccess } from '@/lib/dementia/access'
import { fetchRecords } from '@/lib/dementia/sheets'
import { buildFollowups } from '@/lib/dementia/followups'

export async function GET() {
  const guard = await requireStaff()
  if (guard instanceof NextResponse) return guard

  let result
  try {
    result = await fetchRecords()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `시트 연결 실패: ${msg}` }, { status: 502 })
  }

  const items = buildFollowups(result.records)
  logAccess(guard, 'followups', { count: items.length })

  return NextResponse.json({
    items,
    counts: {
      total: items.length,
      overdue: items.filter((i) => i.dueState === 'overdue').length,
      soon: items.filter((i) => i.dueState === 'soon').length,
    },
    fetchedAt: new Date(result.fetchedAt).toISOString(),
    source: result.source,
  })
}
