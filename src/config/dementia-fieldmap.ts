/**
 * 치매 모니터링 시트 — 컬럼/헤더행/데이터시작행 설정 (명령서 §1.3, §5)
 *
 * ── 마스터 소스 탭 (gid 940998687, "치매모니터 상담(응답)") ──
 * 모든 사람·모든 회차가 쌓이는 구글 폼 응답 탭. 헤더가 두 줄(1행 분류 + 2행 질문).
 *  - 1행: 분류 라벨 (코드번호 / 일반상태 / 섭식 … / 상황 / 기존 / 평가요청 / 작성 / 트리아지)
 *  - 2행: 폼 질문 원문 (타임스탬프 / 어르신 이름 … )
 *  - 3행~: 실제 응답 데이터
 * 컬럼 위치:
 *  A 타임스탬프(상담일시) · C 어르신이름(성명생년월일) · D~P 일상상태 ·
 *  Q 상황(과거와 다른) · R 기존(병력/배경) · S 평가요청 · T 작성(방문자) · U 트리아지
 *
 * 등록서식(H 수식)은 1인용 "당사자" 뷰 탭에만 있고 마스터엔 없으므로,
 * 앱이 위 컬럼들로 등록서식 텍스트를 재구성하고, 사례회의 조치는 TODO 시트에서 조인한다.
 */

const num = (v: string | undefined, fallback: number) => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

/** "1,2" → [1,2] (헤더가 여러 줄에 걸친 경우) */
const rowsList = (v: string | undefined, fallback: number[]) => {
  if (!v) return fallback
  const arr = v
    .split(',')
    .map((x) => Number(x.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
  return arr.length ? arr : fallback
}

export const SHEET_CONFIG = {
  /** 마스터 스프레드시트 ID */
  spreadsheetId:
    process.env.SHEET_ID ?? '1huD5_LKhGsTr7uj7WydosTGJJBCpFKpv-V80pKzrJ6s',
  /** 마스터 폼 응답 탭 gid (전원·전회차). SHEET_GID 로 덮어쓰기 가능 */
  sheetGid: process.env.SHEET_GID ? Number(process.env.SHEET_GID) : 940998687,
  /** gid 대신 탭명으로 지정할 때 */
  sheetTabName: process.env.SHEET_TAB_NAME ?? null,
  /** 헤더 행들(1-base). 여러 줄이면 합쳐서 매핑. 기본 [1,2] */
  headerRows: rowsList(process.env.HEADER_ROWS, [1, 2]),
  /** 데이터 시작 행(1-base). 기본 3 */
  dataStartRow: num(process.env.DATA_START_ROW, 3),
} as const

/**
 * 사례회의 조치(TODO) 시트 — 당사자 수식의 IMPORTRANGE 대상.
 * IMPORTRANGE(todo_id, "사례회의!A:Z") 와 동일 소스.
 *  A 성명생년월일(키) · B 결정일 · C 돌봄서비스(코드포함) · E 처리기한 ·
 *  F 담당 · H 해결여부
 */
export const TODO_CONFIG = {
  spreadsheetId:
    process.env.TODO_SHEET_ID ?? '1ErjKZMshEz-xkBntiE2A6NPnJq5j_RD9gbnuu-cl3Hg',
  sheetGid: process.env.TODO_SHEET_GID ? Number(process.env.TODO_SHEET_GID) : 1584708493,
  sheetTabName: process.env.TODO_TAB_NAME ?? '사례회의',
  headerRow: num(process.env.TODO_HEADER_ROW, 1),
  dataStartRow: num(process.env.TODO_DATA_START_ROW, 2),
  /** 성명생년월일 키가 들어있는 컬럼 인덱스(0-base). A열 = 0 */
  keyColumn: num(process.env.TODO_KEY_COLUMN, 1) - 1,
} as const

/**
 * 명단(대상자) 시트 — "치매모니터링 대상자" 스프레드시트의 명단 탭.
 * 인물 상세 상단에 기본정보를 보강한다(명령서 §8). 코드번호(A) = 성명+생년월일로 조인.
 * 표시 컬럼: H 의료급여 · J 치매진단경로 · L 장기요양등급 · N 요양돌봄기관 · P 병원명
 */
export const ROSTER_CONFIG = {
  spreadsheetId:
    process.env.ROSTER_SHEET_ID ?? '156AbT6Z8CdGhsxF48mO6FE9DITzL1pJ_gmnqMENgjf8',
  sheetGid: process.env.ROSTER_SHEET_GID ? Number(process.env.ROSTER_SHEET_GID) : 1827493174,
  sheetTabName: process.env.ROSTER_TAB_NAME ?? '명단',
  headerRow: num(process.env.ROSTER_HEADER_ROW, 1),
  dataStartRow: num(process.env.ROSTER_DATA_START_ROW, 2),
  /** 코드번호(성명+생년월일) 컬럼. A열 = 0 */
  keyColumn: num(process.env.ROSTER_KEY_COLUMN, 1) - 1,
} as const

/**
 * 통합돌봄서비스 시트 — 트리아지 폴더의 "통합돌봄서비스".
 * 1인당 여러 줄(서비스별). 코드번호(A)로 조인해 인물 상세 상단에 목록 표시.
 *  A 코드번호(성명+생년월일) · B 서비스이름 · C 제공기관 · D 관리행정동 · E 담당자
 */
export const CARE_CONFIG = {
  spreadsheetId:
    process.env.CARE_SHEET_ID ?? '1DubzMny3Cdm2jR5xT9jH2fX9UMjkZPWQhVc2_w78OMc',
  sheetGid: process.env.CARE_SHEET_GID ? Number(process.env.CARE_SHEET_GID) : 632375010,
  sheetTabName: process.env.CARE_TAB_NAME ?? 'Sheet1',
  headerRow: num(process.env.CARE_HEADER_ROW, 1),
  dataStartRow: num(process.env.CARE_DATA_START_ROW, 2),
  keyColumn: num(process.env.CARE_KEY_COLUMN, 1) - 1, // A
  serviceColumn: num(process.env.CARE_SERVICE_COLUMN, 2) - 1, // B 서비스이름
  orgColumn: num(process.env.CARE_ORG_COLUMN, 3) - 1, // C 제공기관
} as const

/** 상단 표시 컬럼(0-base): H=7, J=9, L=11, N=13, P=15. 라벨은 헤더값 없을 때 폴백 */
export const ROSTER_DISPLAY: { col: number; label: string }[] = [
  { col: 7, label: '의료급여' },
  { col: 9, label: '치매진단경로' },
  { col: 11, label: '장기요양등급' },
  { col: 13, label: '요양돌봄기관' },
  { col: 15, label: '병원명' },
]

/**
 * 마스터 탭 필드 → 헤더 별칭. 헤더(공백제거)에 별칭을 "포함"하는 첫 컬럼으로 매핑.
 */
export const FIELD_ALIASES: Record<string, string[]> = {
  personKey: ['성명생년월일', '어르신이름', '어르신', '이름', '대상자', '성명'],
  consultedAt: ['타임스탬프', 'timestamp', '상담일시', '상담일자', '일시'],
  triage: ['트리아지', 'triage'],
  record: ['방문결과등록서식', '방문결과 등록서식', '등록서식'],
  // 등록서식 재구성용
  currentChange: ['과거와다른상황', '과거와 다른 상황', '상황'],
  history: ['기존병력또는배경', '기존병력', '기존', '배경'],
  assessment: ['평가및요청', '평가 및 요청', '평가요청'],
  visitor: ['방문자', '작성자', '작성'],
}

export type FieldKey = keyof typeof FIELD_ALIASES

/**
 * 일상 상태 모니터링 항목(D~P). 등록서식에 "주의/관찰" 항목을 강조해 보여주기 위함.
 */
export const MONITORING_ALIASES: { key: string; label: string; aliases: string[] }[] = [
  { key: 'general', label: '일반상태', aliases: ['일반상태'] },
  { key: 'eating', label: '섭식', aliases: ['섭식'] },
  { key: 'excretion', label: '배설', aliases: ['배설'] },
  { key: 'pain', label: '통증', aliases: ['통증'] },
  { key: 'mobility', label: '이동', aliases: ['이동'] },
  { key: 'sleep', label: '수면', aliases: ['수면'] },
  { key: 'breathing', label: '호흡', aliases: ['호흡'] },
  { key: 'mental', label: '정신', aliases: ['정신'] },
  { key: 'mood', label: '기분', aliases: ['기분'] },
  { key: 'social', label: '사회', aliases: ['사회'] },
  { key: 'env', label: '환경', aliases: ['환경'] },
  { key: 'med', label: '약물', aliases: ['약물'] },
  { key: 'guardian', label: '보호자', aliases: ['보호자'] },
]

/** 헤더 정규화: 공백/개행/특수공백 제거 */
function normHeader(s: string): string {
  return (s ?? '').replace(/[\s​]+/g, '').trim()
}

export interface ColumnMap {
  index: Partial<Record<FieldKey, number>>
  /** 모니터링 항목 key → 컬럼 인덱스 */
  monitoring: { key: string; label: string; col: number }[]
  recognizedHeaders: string[]
}

/**
 * 헤더(한 줄 또는 합쳐진 여러 줄)에서 컬럼 매핑 생성.
 * 별칭이 짧은 것(예: '상황','기존')이 긴 헤더에 잘못 걸리지 않도록,
 * 더 구체적인 별칭이 이미 다른 필드를 점유했으면 건너뛴다.
 */
export function resolveColumns(header: string[]): ColumnMap {
  const normed = header.map(normHeader)
  const index: Partial<Record<FieldKey, number>> = {}
  const used = new Set<number>()

  for (const field of Object.keys(FIELD_ALIASES) as FieldKey[]) {
    const aliases = FIELD_ALIASES[field].map(normHeader)
    const col = normed.findIndex(
      (h, i) => h && !used.has(i) && aliases.some((a) => h.includes(a)),
    )
    if (col >= 0) {
      index[field] = col
      used.add(col)
    }
  }

  const monitoring: { key: string; label: string; col: number }[] = []
  for (const m of MONITORING_ALIASES) {
    const aliases = m.aliases.map(normHeader)
    const col = normed.findIndex(
      (h, i) => h && !used.has(i) && aliases.some((a) => h.includes(a)),
    )
    if (col >= 0) {
      monitoring.push({ key: m.key, label: m.label, col })
      used.add(col)
    }
  }

  return { index, monitoring, recognizedHeaders: header.map((h) => h?.trim() ?? '') }
}
