/**
 * GET /api/monitoring/followups
 * 전체 인물의 미해결/기한임박 조치 모음 (명령서 §3.2.5)
 */
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireStaff, logAccess } from '@/lib/dementia/access'
import { fetchRecords } from '@/lib/dementia/sheets'
import { buildFollowups } from '@/lib/dementia/followups'

export async function GET(req: NextRequest) {
  const guard = await requireStaff()
  if (guard instanceof NextResponse) return guard

  // 개인정보 보호: summary=1 이면 숫자 요약만 반환(마스킹 조치 목록은 미포함)
  const summaryOnly = req.nextUrl.searchParams.get('summary') === '1'

  let result
  try {
    result = await fetchRecords()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `시트 연결 실패: ${msg}` }, { status: 502 })
  }

  const items = buildFollowups(result.records, result.actionsByPerson)
  const counts = {
    total: items.length,
    overdue: items.filter((i) => i.dueState === 'overdue').length,
    soon: items.filter((i) => i.dueState === 'soon').length,
  }
  logAccess(guard, 'followups', { count: items.length, listShown: !summaryOnly })

  return NextResponse.json({
    items: summaryOnly ? [] : items,
    counts,
    fetchedAt: new Date(result.fetchedAt).toISOString(),
    source: result.source,
  })
}
