/**
 * 치매 모니터링 — personKey 묶기 / 요약 생성 (명령서 §2, §3.1)
 *
 * 모든 묶기의 기준은 personKey(성명생년월일).
 */

import type { VisitRecord, PersonSummary, ActionItem } from './types'
import { maskName, maskBirthCode } from './mask'
import { isResolvedStatus } from './parse'

/** 빈 조치 맵 */
const NO_ACTIONS = new Map<string, ActionItem[]>()

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

/**
 * 한 인물의 회차들(최신순) → 목록 카드 요약(마스킹).
 * 조치(미해결 수)는 인물 단위 TODO 조인 결과로 계산(회차마다 중복 집계 방지).
 */
export function summarizePerson(
  personKey: string,
  visits: VisitRecord[],
  actions: ActionItem[] = [],
): PersonSummary {
  const latest = visits[0]
  const maxTriage = visits.reduce((m, v) => Math.max(m, v.triage), 0)
  const openActionCount = actions.filter((a) => isOpenAction(a.status)).length
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

/** 전체 records → 인물 요약 목록 (인물별 조치 맵으로 미해결 수 계산) */
export function buildPeople(
  records: VisitRecord[],
  actionsByPerson: Map<string, ActionItem[]> = NO_ACTIONS,
): PersonSummary[] {
  const grouped = groupByPerson(records)
  const people: PersonSummary[] = []
  for (const [personKey, visits] of grouped) {
    people.push(summarizePerson(personKey, visits, actionsByPerson.get(personKey) ?? []))
  }
  return people
}
