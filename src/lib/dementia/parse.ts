/**
 * 치매 모니터링 — 파서 (명령서 §2.1 / §2.2)
 *
 *  - parsePersonKey: "이순금480115" → { name, birthCode }
 *  - parseConsultedAt: 상담일시 표시문자열 → 정렬용 epoch(ms)
 *  - parseTriage: 트리아지 원문 → 정수 (0/공백 = 0)
 *  - parseActions: 등록서식(record)의 "# 사례회의 결과" 아래 조치 아이템 추출
 *  - buildRecord: 시트 한 행 → VisitRecord
 */

import type { ActionItem, VisitRecord } from './types'
import type { ColumnMap } from '@/config/dementia-fieldmap'

// ── 성명생년월일 (§2.1) ──────────────────────────────────────────────────────
// 한 셀에 성명(한글)+생년월일코드(숫자 6자리). 같은/다음 줄에 상담일시가 붙기도 함.
export function parsePersonKey(raw: string): {
  personKey: string
  name: string
  birthCode: string
  warning: string | null
} {
  const cell = (raw ?? '').trim()
  // 첫 줄만 인물 키로 사용(상담일시가 다음 줄에 올 수 있음)
  const firstLine = cell.split(/[\n\r]/)[0].trim()
  // 한글 성명 + 6자리 숫자 패턴
  const m = firstLine.match(/^([가-힣·\s]+?)\s*(\d{6})/)
  if (m) {
    const name = m[1].replace(/\s+/g, '').trim()
    const birthCode = m[2]
    return { personKey: `${name}${birthCode}`, name, birthCode, warning: null }
  }
  // 형식 불일치: 버리지 않고 경고 (§2.1)
  return {
    personKey: firstLine || cell,
    name: firstLine || cell,
    birthCode: '',
    warning: '성명생년월일 형식 불일치',
  }
}

// ── 상담일시 (§2.1) ──────────────────────────────────────────────────────────
// FORMATTED_STRING 으로 들어온 다양한 표기를 epoch(ms)로. 실패 시 0.
export function parseConsultedAt(raw: string): number {
  const s = (raw ?? '').trim()
  if (!s) return 0
  // YYYY-MM-DD / YYYY.MM.DD / YYYY/MM/DD + 선택적 시:분
  const m = s.match(
    /(\d{4})[.\-/년]\s*(\d{1,2})[.\-/월]\s*(\d{1,2})\s*일?\s*(?:(오전|오후)\s*)?(?:(\d{1,2}):(\d{2}))?/,
  )
  if (!m) return 0
  const [, y, mo, d, ampm, hh, mm] = m
  let hour = hh ? Number(hh) : 0
  if (ampm === '오후' && hour < 12) hour += 12
  if (ampm === '오전' && hour === 12) hour = 0
  const dt = new Date(Number(y), Number(mo) - 1, Number(d), hour, mm ? Number(mm) : 0)
  return Number.isNaN(dt.getTime()) ? 0 : dt.getTime()
}

/**
 * 상담일시 표시용 문자열. A열처럼 "성명생년월일\n상담일시"가 한 칸에 들어온 경우
 * 날짜 부분만 깔끔히 뽑는다. 못 찾으면 마지막 줄.
 */
export function consultedAtDisplay(raw: string): string {
  const s = (raw ?? '').trim()
  if (!s) return ''
  const m = s.match(/(\d{4})[.\-/년]\s*(\d{1,2})[.\-/월]\s*(\d{1,2})[^\n\r]*/)
  if (m) return m[0].trim()
  const lines = s.split(/[\n\r]+/).map((x) => x.trim()).filter(Boolean)
  return lines[lines.length - 1] || s
}

// ── 트리아지 ─────────────────────────────────────────────────────────────────
// 숫자가 높을수록 위험(고위험). 0/공백 = 미분류(0).
export function parseTriage(raw: string): number {
  const m = (raw ?? '').match(/-?\d+/)
  if (!m) return 0
  const n = parseInt(m[0], 10)
  return Number.isFinite(n) && n > 0 ? n : 0
}

// ── 해결여부 상태 → 해결 완료 여부 ───────────────────────────────────────────
// 공백/신규_요청/진행 등은 미해결. 완료/해결/종결 등은 해결.
const RESOLVED_WORDS = ['완료', '해결', '종결', '종료', '완결']
export function isResolvedStatus(status: string): boolean {
  const s = (status ?? '').replace(/\s+/g, '')
  if (!s) return false
  return RESOLVED_WORDS.some((w) => s.includes(w))
}

// ── 사례회의 조치 아이템 (§2.2) ──────────────────────────────────────────────
// 패턴: [YYYY-MM-DD] (숫자코드?)조치내용(기관) (기한: YYYY-MM-DD / 해결여부: 상태)
//  예 : [2026-06-25] 251천원택시(서구) (기한: 2026-07-25 / 해결여부: 신규_요청)
const ACTION_RE =
  /\[(\d{4}-\d{2}-\d{2})\]\s*(.+?)\s*\(\s*기한\s*[:：]\s*([0-9\-./]*)\s*[/／]\s*해결여부\s*[:：]\s*([^)]*)\)/

export function parseActionLine(line: string): ActionItem | null {
  const raw = line.trim()
  const m = raw.match(ACTION_RE)
  if (!m) return null

  const actionDate = m[1]
  let middle = m[2].trim() // 예: "251천원택시(서구)"
  const dueDateRaw = m[3].trim()
  const status = m[4].trim()

  // 선행 숫자코드 분리
  const codeMatch = middle.match(/^(\d+)\s*/)
  const code = codeMatch ? codeMatch[1] : null
  if (codeMatch) middle = middle.slice(codeMatch[0].length).trim()

  // 끝의 (기관) 분리
  let org: string | null = null
  let actionText = middle
  const orgMatch = middle.match(/\(([^()]*)\)\s*$/)
  if (orgMatch) {
    org = orgMatch[1].trim() || null
    actionText = middle.slice(0, orgMatch.index).trim()
  }

  const dueDate = dueDateRaw ? dueDateRaw.replace(/[./]/g, '-') : null

  return {
    actionDate,
    code,
    actionText,
    org,
    dueDate,
    status,
    resolved: isResolvedStatus(status),
    raw,
  }
}

/** record 텍스트 전체에서 "# 사례회의 결과" 아래 조치 아이템들 추출 */
export function parseActions(record: string): ActionItem[] {
  const text = record ?? ''
  if (!text) return []

  const lines = text.replace(/\r\n/g, '\n').split('\n')
  // "# 사례회의 결과" 헤더 위치 찾기 (없으면 전체에서 패턴 스캔)
  const headerIdx = lines.findIndex((l) => /사례회의\s*결과/.test(l))
  const scan = headerIdx >= 0 ? lines.slice(headerIdx + 1) : lines

  const items: ActionItem[] = []
  for (const line of scan) {
    const item = parseActionLine(line)
    if (item) items.push(item)
  }
  return items
}

// ── 날짜 정규화 ("26-03-18" → "2026-03-18") ─────────────────────────────────
export function normalizeDate(s: string): string | null {
  const t = (s ?? '').trim()
  if (!t) return null
  const m = t.match(/(\d{2,4})[.\-/년]\s*(\d{1,2})[.\-/월]\s*(\d{1,2})/)
  if (!m) return null
  let year = Number(m[1])
  if (year < 100) year += 2000
  const mo = String(Number(m[2])).padStart(2, '0')
  const d = String(Number(m[3])).padStart(2, '0')
  return `${year}-${mo}-${d}`
}

// ── 사례회의 TODO 행 → ActionItem ────────────────────────────────────────────
export interface TodoCols {
  decidedDate?: number
  service?: number
  dueDate?: number
  owner?: number
  status?: number
}
export function buildTodoAction(row: string[], cols: TodoCols): ActionItem | null {
  const get = (i?: number) => (i == null ? '' : (row[i] ?? '').toString().trim())
  const service = get(cols.service)
  const owner = get(cols.owner)
  const status = get(cols.status)
  const decided = normalizeDate(get(cols.decidedDate))
  const due = normalizeDate(get(cols.dueDate))
  if (!service && !owner && !due) return null // 빈 행

  // "251천원택시(서구)" → code 251, text 천원택시, org 서구
  let middle = service
  const codeMatch = middle.match(/^(\d+)\s*/)
  const code = codeMatch ? codeMatch[1] : null
  if (codeMatch) middle = middle.slice(codeMatch[0].length).trim()
  let org: string | null = owner || null
  let actionText = middle
  const orgMatch = middle.match(/\(([^()]*)\)\s*$/)
  if (orgMatch) {
    org = orgMatch[1].trim() || owner || null
    actionText = middle.slice(0, orgMatch.index).trim()
  }

  return {
    actionDate: decided ?? '',
    code,
    actionText: actionText || service,
    org,
    dueDate: due,
    status,
    resolved: isResolvedStatus(status),
    raw: `[${decided ?? ''}] ${service} (기한: ${due ?? ''} / 해결여부: ${status})`,
  }
}

// ── 시트 한 행 → VisitRecord ─────────────────────────────────────────────────
function cell(row: string[], idx: number | undefined): string {
  if (idx == null) return ''
  return (row[idx] ?? '').toString()
}

const NORMAL_RE = /(안정|유지|정상|없음|해당\s*없음|양호)/

/**
 * 마스터 탭 컬럼들로 등록서식 텍스트를 재구성(당사자 뷰 H 수식과 동일 형식).
 */
function reconstructRecord(
  row: string[],
  colMap: ColumnMap,
  personKey: string,
  consultedDisplay: string,
  triageRaw: string,
): string {
  const idx = colMap.index
  const lines: string[] = ['# 시니어간호사 방문상담']
  lines.push(`□ 당사자 및 상담일시: ${personKey} ${consultedDisplay}`.trim())
  if (triageRaw) lines.push(`□ 트리아지: ${triageRaw}점`)

  // 일상 모니터링: 주의/관찰(비정상) 항목 강조
  if (colMap.monitoring.length) {
    const flagged = colMap.monitoring
      .map((m) => ({ label: m.label, val: cell(row, m.col).trim() }))
      .filter((x) => x.val && !NORMAL_RE.test(x.val))
    if (flagged.length) {
      lines.push(`□ 주의/관찰: ${flagged.map((f) => `${f.label}(${f.val})`).join(', ')}`)
    } else {
      lines.push('□ 일상상태: 전부 안정/유지')
    }
  }

  const push = (label: string, i?: number) => {
    const v = cell(row, i).trim()
    if (v) lines.push(`□ ${label}: ${v}`)
  }
  push('과거와 다른 현재 상황', idx.currentChange)
  push('기존병력 또는 배경', idx.history)
  push('평가 및 요청', idx.assessment)
  push('방문자', idx.visitor)

  return lines.join('\n')
}

export function buildRecord(
  row: string[],
  colMap: ColumnMap,
  rowIndex: number,
): VisitRecord {
  const idx = colMap.index
  const personRaw = cell(row, idx.personKey)
  const { personKey, name, birthCode, warning } = parsePersonKey(personRaw)

  const consultedRaw = cell(row, idx.consultedAt).trim()
  const consultedAt = consultedAtDisplay(consultedRaw)
  const consultedAtMs = parseConsultedAt(consultedRaw)

  const triageRaw = cell(row, idx.triage).trim()
  const triage = parseTriage(triageRaw)

  // H(등록서식)가 있으면 그대로, 없으면(마스터 탭) 컬럼들로 재구성
  let record = cell(row, idx.record).trim()
  if (!record) record = reconstructRecord(row, colMap, personKey, consultedAt, triageRaw)

  // 회차 자체 텍스트에 박힌 조치(당사자 탭 등)는 파싱. 마스터 탭은 보통 없음(조치는 TODO 조인).
  const actions = parseActions(record)

  return {
    rowIndex,
    personKey,
    name,
    birthCode,
    consultedAt: consultedAt || '(상담일시 없음)',
    consultedAtMs,
    triage,
    triageRaw,
    record,
    actions,
    parseWarning: warning,
  }
}
