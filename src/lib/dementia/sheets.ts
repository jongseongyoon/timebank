/**
 * 치매 모니터링 — 구글 시트 접근 (명령서 §5 옵션 A)
 *
 *  - 서비스 계정(읽기 전용)으로 원본 탭을 읽는다.
 *  - H열(등록서식)은 =LET(...) 수식이므로 FORMATTED_VALUE 로 "계산된 값"을 읽는다(FORMULA 금지).
 *  - 1행 라벨 / 2행 / 헤더행(기본 3) 위쪽을 스킵, 데이터는 DATA_START_ROW(기본 4)부터.
 *  - 비밀키는 서버 환경변수에만. (NEXT_PUBLIC_ 금지)
 *
 * 결과는 짧게 메모리 캐시(부하/쿼터 완화). "마지막 갱신 시각"을 화면에 표시.
 */

import { google } from 'googleapis'
import { SHEET_CONFIG, resolveColumns } from '@/config/dementia-fieldmap'
import { buildRecord } from './parse'
import type { VisitRecord } from './types'

// ── 서비스 계정 인증 (읽기 전용 스코프) ──────────────────────────────────────
// 기존 google-sheets-creator.ts 의 키 정규화 로직과 동일한 방식.
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
  fetchedAt: number          // epoch(ms)
  source: string             // "시트명 › 탭명"
  warnings: string[]
  recognizedHeaders: string[]
}

// ── 메모리 캐시 ───────────────────────────────────────────────────────────────
const TTL_MS = 60_000
let cache: FetchResult | null = null
let loggedHeaders = false

/** 데이터 소스 탭 제목을 gid → 탭명 → 첫 탭 순서로 결정 */
async function resolveTabTitle(
  sheets: ReturnType<typeof google.sheets>,
): Promise<{ title: string; spreadsheetTitle: string }> {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: SHEET_CONFIG.spreadsheetId,
    fields: 'properties.title,sheets.properties(sheetId,title,index)',
  })
  const spreadsheetTitle = meta.data.properties?.title ?? '시트'
  const tabs = (meta.data.sheets ?? []).map((s) => s.properties!)

  if (SHEET_CONFIG.sheetGid != null) {
    const hit = tabs.find((t) => t.sheetId === SHEET_CONFIG.sheetGid)
    if (hit?.title) return { title: hit.title, spreadsheetTitle }
    throw new Error(
      `SHEET_GID=${SHEET_CONFIG.sheetGid} 에 해당하는 탭을 찾을 수 없습니다. ` +
        `탭 목록: ${tabs.map((t) => `${t.title}(${t.sheetId})`).join(', ')}`,
    )
  }
  if (SHEET_CONFIG.sheetTabName) {
    const hit = tabs.find((t) => t.title === SHEET_CONFIG.sheetTabName)
    if (hit?.title) return { title: hit.title, spreadsheetTitle }
  }
  // 폴백: index 0 탭
  const first = tabs.sort((a, b) => (a.index ?? 0) - (b.index ?? 0))[0]
  if (!first?.title) throw new Error('스프레드시트에 탭이 없습니다.')
  return { title: first.title, spreadsheetTitle }
}

export async function fetchRecords(force = false): Promise<FetchResult> {
  if (!force && cache && Date.now() - cache.fetchedAt < TTL_MS) return cache

  const auth = getGoogleAuth()
  await auth.authorize()
  const sheets = google.sheets({ version: 'v4', auth })

  const { title, spreadsheetTitle } = await resolveTabTitle(sheets)

  // 반드시 계산된 값(FORMATTED_VALUE) + 날짜는 표시문자열로
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_CONFIG.spreadsheetId,
    range: `'${title}'`,
    valueRenderOption: 'FORMATTED_VALUE',
    dateTimeRenderOption: 'FORMATTED_STRING',
  })

  const rows = (res.data.values ?? []) as string[][]
  const warnings: string[] = []

  const headerIdx = SHEET_CONFIG.headerRow - 1
  const header = rows[headerIdx] ?? []
  const { index: cols, recognizedHeaders } = resolveColumns(header)

  // 첫 실행 시 인식한 헤더/샘플 2행 로그 (명령서 §1.4)
  if (!loggedHeaders) {
    loggedHeaders = true
    console.log('[dementia-sheets] 탭:', `${spreadsheetTitle} › ${title}`)
    console.log('[dementia-sheets] 인식 헤더(3행):', recognizedHeaders)
    console.log('[dementia-sheets] 컬럼 매핑:', cols)
    console.log(
      '[dementia-sheets] 샘플 2행:',
      rows.slice(SHEET_CONFIG.dataStartRow - 1, SHEET_CONFIG.dataStartRow + 1),
    )
  }

  if (cols.personKey == null) {
    warnings.push(
      '성명생년월일 컬럼을 헤더에서 찾지 못했습니다. config/dementia-fieldmap.ts 의 별칭을 확인하세요. ' +
        `인식 헤더: ${recognizedHeaders.filter(Boolean).join(', ')}`,
    )
  }
  if (cols.record == null) {
    warnings.push('방문결과 등록서식(H) 컬럼을 찾지 못했습니다. 개별 컬럼으로 보완합니다.')
  }

  const records: VisitRecord[] = []
  for (let r = SHEET_CONFIG.dataStartRow - 1; r < rows.length; r++) {
    const row = rows[r] ?? []
    // 완전히 빈 행 스킵
    if (row.every((c) => !c || !c.toString().trim())) continue
    // personKey 컬럼이 비어있으면 데이터 행 아님(스킵)
    if (cols.personKey != null && !(row[cols.personKey] ?? '').toString().trim()) {
      continue
    }
    records.push(buildRecord(row, cols, r + 1))
  }

  const warnCount = records.filter((r) => r.parseWarning).length
  if (warnCount > 0) warnings.push(`성명생년월일 파싱 경고 ${warnCount}건`)

  cache = {
    records,
    fetchedAt: Date.now(),
    source: `${spreadsheetTitle} › ${title}`,
    warnings,
    recognizedHeaders,
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
    sheetTabName: SHEET_CONFIG.sheetTabName,
  }
}
