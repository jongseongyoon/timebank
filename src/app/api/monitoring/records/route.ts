/**
 * GET /api/monitoring/records
 * 원본 탭(전체) 읽기 → personKey 그룹핑 → 마스킹 목록 반환 (명령서 §3.1.2)
 *
 * - 인증·권한 통과한 직원만 (미인증/권한없음은 데이터 차단)
 * - record 본문/생년월일 전체는 목록에 노출하지 않음(상세 전용)
 * - 쿼리: ?search= (성명/코드/초성), ?sort=recent|triage, ?triage=N (최소 등급)
 */
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireStaff, logAccess } from '@/lib/dementia/access'
import { fetchRecords } from '@/lib/dementia/sheets'
import { buildPeople, groupByPerson } from '@/lib/dementia/identity'
import { matchPerson } from '@/lib/dementia/search'
import type { RecordsResponse } from '@/lib/dementia/types'

export async function GET(req: NextRequest) {
  const guard = await requireStaff()
  if (guard instanceof NextResponse) return guard

  const { searchParams } = req.nextUrl
  const search = (searchParams.get('search') ?? '').trim()
  const sort = searchParams.get('sort') ?? 'recent'
  const minTriage = Number(searchParams.get('triage') ?? '0') || 0

  let result
  try {
    result = await fetchRecords(searchParams.get('refresh') === '1')
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `시트 연결 실패: ${msg}` }, { status: 502 })
  }

  // personKey 단위로 검색 (인물 단위)
  const grouped = groupByPerson(result.records)
  let people = buildPeople(result.records)

  if (search) {
    people = people.filter((p) => {
      const visits = grouped.get(p.personKey)!
      const v = visits[0]
      return matchPerson(search, v.name, v.birthCode, p.personKey)
    })
  }
  if (minTriage > 0) {
    people = people.filter((p) => p.maxTriage >= minTriage)
  }

  // 정렬 (트리아지: 숫자 높을수록 위험 → 우선)
  if (sort === 'triage') {
    people.sort(
      (a, b) =>
        b.maxTriage - a.maxTriage ||
        b.latestTriage - a.latestTriage ||
        b.lastConsultedAtMs - a.lastConsultedAtMs,
    )
  } else {
    people.sort((a, b) => b.lastConsultedAtMs - a.lastConsultedAtMs)
  }

  logAccess(guard, search ? 'search' : 'list', {
    search: search || undefined,
    count: people.length,
  })

  const body: RecordsResponse = {
    people,
    total: grouped.size,
    fetchedAt: new Date(result.fetchedAt).toISOString(),
    warnings: result.warnings,
    source: result.source,
  }
  return NextResponse.json(body)
}
