/**
 * GET /api/monitoring/person/[personKey]
 * 인물 상세 — 그 사람의 방문 이력 전체(최신순) 반환 (명령서 §3.1.3)
 *
 * 상세는 인증된 권한자에게만 전체(성명/생년월일/record 본문) 노출.
 */
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireStaff, logAccess } from '@/lib/dementia/access'
import { fetchRecords } from '@/lib/dementia/sheets'
import { groupByPerson } from '@/lib/dementia/identity'

export async function GET(
  _req: NextRequest,
  { params }: { params: { personKey: string } },
) {
  const guard = await requireStaff()
  if (guard instanceof NextResponse) return guard

  const personKey = decodeURIComponent(params.personKey)

  let result
  try {
    result = await fetchRecords()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `시트 연결 실패: ${msg}` }, { status: 502 })
  }

  const grouped = groupByPerson(result.records)
  const visits = grouped.get(personKey)
  if (!visits || visits.length === 0) {
    return NextResponse.json({ error: '해당 인물을 찾을 수 없습니다.' }, { status: 404 })
  }

  logAccess(guard, 'detail', { personKey, visits: visits.length })

  const head = visits[0]
  const actions = result.actionsByPerson.get(personKey) ?? []
  const roster = result.rosterByPerson.get(personKey) ?? []
  const care = result.careByPerson.get(personKey) ?? []
  return NextResponse.json({
    personKey,
    name: head.name,
    birthCode: head.birthCode,
    visitCount: visits.length,
    maxTriage: visits.reduce((m, v) => Math.max(m, v.triage), 0),
    roster, // 명단 기본정보(상단 표시)
    care, // 통합돌봄서비스(인물 단위)
    visits, // 최신순 (record 본문 포함 — 상세 전용)
    actions, // 사례회의 조치(인물 단위)
    fetchedAt: new Date(result.fetchedAt).toISOString(),
    source: result.source,
  })
}
