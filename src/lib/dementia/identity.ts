/**
 * 치매 모니터링 — personKey 묶기 / 요약 생성 (명령서 §2, §3.1)
 *
 * 모든 묶기의 기준은 personKey(성명생년월일).
 */

import type { VisitRecord, PersonSummary } from './types'
import { maskName, maskBirthCode } from './mask'
import { isResolvedStatus } from './parse'

/** 미해결 조치인가: 해결 완료 상태가 아니면 미해결(공백/신규_요청/진행 포함) */
export function isOpenAction(status: string): boolean {
  return !isResolvedStatus(status)
}

/** personKey → 회차 배열 (각 인물의 회차는 최신순 정렬) */
export function groupByPerson(records: VisitRecord[]): Map<string, VisitRecord[]> {
  const map = new Map<string, VisitRecord[]>()
  for (const r of records) {
    const list = map.get(r.personKey) ?? []
    list.push(r)
    map.set(r.personKey, list)
  }
  for (const list of map.values()) {
    list.sort((a, b) => b.consultedAtMs - a.consultedAtMs || b.rowIndex - a.rowIndex)
  }
  return map
}

/** 한 인물의 회차들(최신순) → 목록 카드 요약(마스킹) */
export function summarizePerson(personKey: string, visits: VisitRecord[]): PersonSummary {
  const latest = visits[0]
  const maxTriage = visits.reduce((m, v) => Math.max(m, v.triage), 0)
  const openActionCount = visits.reduce(
    (n, v) => n + v.actions.filter((a) => isOpenAction(a.status)).length,
    0,
  )
  return {
    personKey,
    maskedName: maskName(latest.name),
    maskedBirthCode: maskBirthCode(latest.birthCode),
    visitCount: visits.length,
    lastConsultedAt: latest.consultedAt,
    lastConsultedAtMs: latest.consultedAtMs,
    latestTriage: latest.triage,
    maxTriage,
    openActionCount,
    hasParseWarning: visits.some((v) => v.parseWarning != null),
  }
}

/** 전체 records → 인물 요약 목록 */
export function buildPeople(records: VisitRecord[]): PersonSummary[] {
  const grouped = groupByPerson(records)
  const people: PersonSummary[] = []
  for (const [personKey, visits] of grouped) {
    people.push(summarizePerson(personKey, visits))
  }
  return people
}
