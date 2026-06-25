/**
 * 치매 모니터링 — 팔로업 집계 (명령서 §3.2.5)
 *
 * 전체 인물의 조치(actions)를 모아 미해결/기한임박 순으로.
 */

import type { VisitRecord, FollowupItem } from './types'
import { maskName } from './mask'
import { isOpenAction } from './identity'

const DAY = 86_400_000

/** 기한 임박도 판정 (오늘 기준) */
function dueState(dueDate: string | null, now: number): FollowupItem['dueState'] {
  if (!dueDate) return 'none'
  const t = new Date(dueDate + 'T23:59:59').getTime()
  if (Number.isNaN(t)) return 'none'
  const diff = t - now
  if (diff < 0) return 'overdue'
  if (diff <= 7 * DAY) return 'soon'
  return 'later'
}

const STATE_ORDER: Record<FollowupItem['dueState'], number> = {
  overdue: 0,
  soon: 1,
  later: 2,
  none: 3,
}

/**
 * 미해결 조치만 모아 팔로업 목록 생성.
 * 정렬: 지남 → 임박 → 나중 → 기한없음, 그 안에서 기한 빠른 순.
 */
export function buildFollowups(records: VisitRecord[], now = Date.now()): FollowupItem[] {
  const items: FollowupItem[] = []

  for (const rec of records) {
    for (const a of rec.actions) {
      if (!isOpenAction(a.status)) continue
      items.push({
        ...a,
        personKey: rec.personKey,
        maskedName: maskName(rec.name),
        consultedAt: rec.consultedAt,
        triage: rec.triage,
        dueState: dueState(a.dueDate, now),
      })
    }
  }

  items.sort((x, y) => {
    const s = STATE_ORDER[x.dueState] - STATE_ORDER[y.dueState]
    if (s !== 0) return s
    // 기한 빠른 순 (없으면 뒤로)
    const dx = x.dueDate ? new Date(x.dueDate).getTime() : Infinity
    const dy = y.dueDate ? new Date(y.dueDate).getTime() : Infinity
    if (dx !== dy) return dx - dy
    return y.triage - x.triage
  })

  return items
}
