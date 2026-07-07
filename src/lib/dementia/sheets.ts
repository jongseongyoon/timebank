/**
 * 치매 모니터링 — 구글 시트 접근 (명령서 §5 옵션 A)
 *
 *  - 서비스 계정(읽기 전용)으로 마스터 폼 응답 탭(gid 940998687)을 읽는다.
 *  - 헤더가 두 줄(1행 분류 + 2행 질문)이라 합쳐서 컬럼을 매핑한다.
 *  - 등록서식(H)은 마스터엔 없으므로 컬럼들로 재구성하고, 사례회의 조치는
 *    별도 TODO 시트(사례회의)를 성명생년월일로 조인한다.
 *  - 값은 FORMATTED_VALUE 로 계산된 결과를 읽는다(FORMULA 금지).
 *  - 비밀키는 서버 환경변수에만. (NEXT_PUBLIC_ 금지)
 *
 * 결과는 짧게 메모리 캐시(부하/쿼터 완화). "마지막 갱신 시각"을 화면에 표시.
 */

import { google } from 'googleapis'
import {
  SHEET_CONFIG,
  TODO_CONFIG,
  ROSTER_CONFIG,
  ROSTER_DISPLAY,
  CARE_CONFIG,
  resolveColumns,
} from '@/config/dementia-fieldmap'
import { buildRecord, buildTodoAction } from './parse'
import type { VisitRecord, ActionItem, RosterField, CareService } from './types'

/** 조인 키 정규화(공백 제거) */
const normKey = (s: string) => (s ?? '').toString().replace(/\s+/g, '')

/** 시트 공유 안내에 넣을 서비스계정(로봇) 이메일 */
const serviceEmail = () => process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? '(서비스계정 이메일 미설정)'

type Sheets = ReturnType<typeof google.sheets>

// ── 서비스 계정 인증 (읽기 전용 스코프) ──────────────────────────────────────
function getGoogleAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const rawKey = process.env.GOOGLE_PRIVATE_KEY
  if (!email || !rawKey) {
    throw new Error(
      'GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY 가 설정되지 않았습니다.',
    )
  }
  let privateKey = rawKey.replace(/\\n/g, '\n').replace(/\\r/g, '')
  privateKey = privateKey
    .replace(/(-----BEGIN [^-]+-----)([^\n])/g, '$1\n$2')
    .replace(/([^\n])(-----END [^-]+-----)/g, '$1\n$2')

  return new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })
}

export interface FetchResult {
  records: VisitRecord[]
  actionsByPerson: Map<string, ActionItem[]>
  rosterByPerson: Map<string, RosterField[]>
  careByPerson: Map<string, CareService[]>
  fetchedAt: number
  source: string
  warnings: string[]
  recognizedHeaders: string[]
}

// ── 메모리 캐시 ───────────────────────────────────────────────────────────────
const TTL_MS = 60_000
let cache: FetchResult | null = null
let logged = false

/** 스프레드시트의 탭 제목을 gid → 탭명 → 첫 탭 순서로 결정 */
async function resolveTabTitle(
  sheets: Sheets,
  spreadsheetId: string,
  gid: number | null,
  tabName: string | null,
): Promise<{ title: string; spreadsheetTitle: string; tabsDebug: string }> {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'properties.title,sheets.properties(sheetId,title,index)',
  })
  const spreadsheetTitle = meta.data.properties?.title ?? '시트'
  const tabs = (meta.data.sheets ?? []).map((s) => s.properties!)
  const tabsDebug = tabs.map((t) => `${t.title}(${t.sheetId})`).join(', ')

  if (gid != null) {
    const hit = tabs.find((t) => t.sheetId === gid)
    if (hit?.title) return { title: hit.title, spreadsheetTitle, tabsDebug }
  }
  if (tabName) {
    const hit = tabs.find((t) => t.title === tabName)
    if (hit?.title) return { title: hit.title, spreadsheetTitle, tabsDebug }
  }
  const first = tabs.sort((a, b) => (a.index ?? 0) - (b.index ?? 0))[0]
  if (!first?.title) throw new Error('스프레드시트에 탭이 없습니다.')
  return { title: first.title, spreadsheetTitle, tabsDebug }
}

async function readValues(sheets: Sheets, spreadsheetId: string, title: string) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${title}'`,
    valueRenderOption: 'FORMATTED_VALUE',
    dateTimeRenderOption: 'FORMATTED_STRING',
  })
  return (res.data.values ?? []) as string[][]
}

/** 여러 헤더 행을 컬럼별로 합쳐 하나의 헤더 배열로 */
function combineHeaderRows(rows: string[][], headerRows: readonly number[]): string[] {
  const idxs = headerRows.map((r) => r - 1)
  const maxCols = Math.max(0, ...idxs.map((ri) => rows[ri]?.length ?? 0))
  const header: string[] = []
  for (let c = 0; c < maxCols; c++) {
    header[c] = idxs
      .map((ri) => (rows[ri]?.[c] ?? '').toString().trim())
      .filter(Boolean)
      .join(' ')
  }
  return header
}

/** 사례회의 TODO 시트 → personKey별 조치 맵 (접근 실패 시 빈 맵 + 경고) */
async function fetchTodos(
  sheets: Sheets,
  warnings: string[],
): Promise<Map<string, ActionItem[]>> {
  const map = new Map<string, ActionItem[]>()
  try {
    const { title } = await resolveTabTitle(
      sheets,
      TODO_CONFIG.spreadsheetId,
      TODO_CONFIG.sheetGid,
      TODO_CONFIG.sheetTabName,
    )
    const rows = await readValues(sheets, TODO_CONFIG.spreadsheetId, title)
    const header = rows[TODO_CONFIG.headerRow - 1] ?? []
    const norm = (s: string) => (s ?? '').replace(/\s+/g, '')
    const find = (aliases: string[]) =>
      header.findIndex((h) => h && aliases.some((a) => norm(h).includes(norm(a))))
    const cols = {
      decidedDate: find(['결정일']),
      service: find(['돌봄서비스', 'to-do', 'todo']),
      dueDate: find(['처리기한', 'dudate', '기한']),
      owner: find(['담당']),
      status: find(['해결여부']),
    }
    const colOrUndef = (n: number) => (n >= 0 ? n : undefined)

    for (let r = TODO_CONFIG.dataStartRow - 1; r < rows.length; r++) {
      const row = rows[r] ?? []
      const key = (row[TODO_CONFIG.keyColumn] ?? '').toString().trim()
      if (!key) continue
      const action = buildTodoAction(row, {
        decidedDate: colOrUndef(cols.decidedDate),
        service: colOrUndef(cols.service),
        dueDate: colOrUndef(cols.dueDate),
        owner: colOrUndef(cols.owner),
        status: colOrUndef(cols.status),
      })
      if (!action) continue
      // 키 정규화(공백 제거)로 마스터 personKey와 매칭
      const normKey = key.replace(/\s+/g, '')
      const list = map.get(normKey) ?? []
      list.push(action)
      map.set(normKey, list)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    warnings.push(
      `사례회의(조치) 시트를 읽지 못했습니다. 이 이메일을 시트에 뷰어로 공유하세요 → ${serviceEmail()} (${msg})`,
    )
  }
  return map
}

/** 명단(대상자) 시트 → personKey별 기본정보(상단 표시) 맵. 접근 실패 시 빈 맵 + 경고 */
async function fetchRoster(
  sheets: Sheets,
  warnings: string[],
): Promise<Map<string, RosterField[]>> {
  const map = new Map<string, RosterField[]>()
  try {
    const { title } = await resolveTabTitle(
      sheets,
      ROSTER_CONFIG.spreadsheetId,
      ROSTER_CONFIG.sheetGid,
      ROSTER_CONFIG.sheetTabName,
    )
    const rows = await readValues(sheets, ROSTER_CONFIG.spreadsheetId, title)
    const header = rows[ROSTER_CONFIG.headerRow - 1] ?? []

    for (let r = ROSTER_CONFIG.dataStartRow - 1; r < rows.length; r++) {
      const row = rows[r] ?? []
      const key = normKey((row[ROSTER_CONFIG.keyColumn] ?? '').toString())
      if (!key) continue
      const fields: RosterField[] = []
      for (const { col, label } of ROSTER_DISPLAY) {
        const value = (row[col] ?? '').toString().trim()
        if (value) {
          fields.push({ label: (header[col] ?? '').toString().trim() || label, value })
        }
      }
      if (fields.length) map.set(key, fields)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    warnings.push(
      `명단(대상자) 시트를 읽지 못했습니다. 이 이메일을 시트에 뷰어로 공유하세요 → ${serviceEmail()} (${msg})`,
    )
  }
  return map
}

/** 통합돌봄서비스 시트 → personKey별 서비스 목록(1인 다건). 실패 시 빈 맵 + 경고 */
async function fetchCare(
  sheets: Sheets,
  warnings: string[],
): Promise<Map<string, CareService[]>> {
  const map = new Map<string, CareService[]>()
  try {
    const { title } = await resolveTabTitle(
      sheets,
      CARE_CONFIG.spreadsheetId,
      CARE_CONFIG.sheetGid,
      CARE_CONFIG.sheetTabName,
    )
    const rows = await readValues(sheets, CARE_CONFIG.spreadsheetId, title)
    for (let r = CARE_CONFIG.dataStartRow - 1; r < rows.length; r++) {
      const row = rows[r] ?? []
      const key = normKey((row[CARE_CONFIG.keyColumn] ?? '').toString())
      if (!key) continue
      const service = (row[CARE_CONFIG.serviceColumn] ?? '').toString().trim()
      const org = (row[CARE_CONFIG.orgColumn] ?? '').toString().trim()
      if (!service && !org) continue
      const list = map.get(key) ?? []
      // 같은 서비스+기관 중복 제거
      if (!list.some((x) => x.service === service && x.org === org)) {
        list.push({ service, org })
      }
      map.set(key, list)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    warnings.push(
      `통합돌봄서비스 시트를 읽지 못했습니다. 이 이메일을 시트에 뷰어로 공유하세요 → ${serviceEmail()} (${msg})`,
    )
  }
  return map
}

export async function fetchRecords(force = false): Promise<FetchResult> {
  if (!force && cache && Date.now() - cache.fetchedAt < TTL_MS) return cache

  const auth = getGoogleAuth()
  await auth.authorize()
  const sheets = google.sheets({ version: 'v4', auth })

  const warnings: string[] = []
  const { title, spreadsheetTitle, tabsDebug } = await resolveTabTitle(
    sheets,
    SHEET_CONFIG.spreadsheetId,
    SHEET_CONFIG.sheetGid,
    SHEET_CONFIG.sheetTabName,
  )

  const rows = await readValues(sheets, SHEET_CONFIG.spreadsheetId, title)

  const header = combineHeaderRows(rows, SHEET_CONFIG.headerRows)
  const colMap = resolveColumns(header)
  const cols = colMap.index
  const dataStartIdx = SHEET_CONFIG.dataStartRow - 1

  if (!logged) {
    logged = true
    console.log('[dementia-sheets] 탭:', `${spreadsheetTitle} › ${title}`)
    console.log('[dementia-sheets] 탭 목록:', tabsDebug)
    console.log('[dementia-sheets] 합친 헤더:', colMap.recognizedHeaders)
    console.log('[dementia-sheets] 컬럼 매핑:', cols)
    console.log('[dementia-sheets] 모니터링 항목:', colMap.monitoring.map((m) => m.label))
    console.log('[dementia-sheets] 샘플 2행:', rows.slice(dataStartIdx, dataStartIdx + 2))
  }

  if (cols.personKey == null) {
    warnings.push(
      '성명생년월일(어르신 이름) 컬럼을 찾지 못했습니다. config/dementia-fieldmap.ts 별칭 확인. ' +
        `인식 헤더: ${colMap.recognizedHeaders.filter(Boolean).join(' | ')}`,
    )
  }

  const records: VisitRecord[] = []
  for (let r = dataStartIdx; r < rows.length; r++) {
    const row = rows[r] ?? []
    if (row.every((c) => !c || !c.toString().trim())) continue
    if (cols.personKey != null && !(row[cols.personKey] ?? '').toString().trim()) continue
    records.push(buildRecord(row, colMap, r + 1))
  }

  // 사례회의 조치 + 명단 기본정보 + 통합돌봄서비스 조인 (인물 단위)
  const [actionsByPerson, rosterByPerson, careByPerson] = await Promise.all([
    fetchTodos(sheets, warnings),
    fetchRoster(sheets, warnings),
    fetchCare(sheets, warnings),
  ])

  const warnCount = records.filter((r) => r.parseWarning).length
  if (warnCount > 0) warnings.push(`성명생년월일 파싱 경고 ${warnCount}건`)

  cache = {
    records,
    actionsByPerson,
    rosterByPerson,
    careByPerson,
    fetchedAt: Date.now(),
    source: `${spreadsheetTitle} › ${title}`,
    warnings,
    recognizedHeaders: colMap.recognizedHeaders,
  }
  return cache
}

/** 환경변수 설정 상태 (설정 안내용) */
export function getSheetEnvStatus() {
  return {
    hasServiceEmail: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    hasPrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
    spreadsheetId: SHEET_CONFIG.spreadsheetId,
    sheetGid: SHEET_CONFIG.sheetGid,
  }
}
