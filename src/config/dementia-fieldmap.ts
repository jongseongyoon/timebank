/**
 * 치매 모니터링 시트 — 컬럼/헤더행/데이터시작행 설정 (명령서 §1.3, §5)
 *
 * 이 시트는 일반 구글 폼 응답 시트가 아니다.
 *  - 1행: 라벨/선택 영역 (예: A1 "성명생년월일", B1 "이순금480115") → 무시
 *  - 2행: 비어있음/숨김 → 무시
 *  - 3행: 실제 헤더 행 (기본값 HEADER_ROW=3)
 *  - 4행~: 실제 데이터 (기본값 DATA_START_ROW=4)
 *
 * 컬럼은 고정 위치(A/B/H)가 아니라 헤더 "이름"으로 매핑한다.
 * 시트 컬럼 순서가 바뀌어도 동작하도록 하기 위함이며, 운영자는 별칭만 추가하면 된다.
 */

const num = (v: string | undefined, fallback: number) => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

export const SHEET_CONFIG = {
  /** 스프레드시트 ID (명령서 §0) */
  spreadsheetId:
    process.env.SHEET_ID ?? '1huD5_LKhGsTr7uj7WydosTGJJBCpFKpv-V80pKzrJ6s',
  /** 전체 기록(원본/응답) 탭의 gid — 운영자 지정 필수(TODO). 미지정 시 탭명/첫 탭 폴백 */
  sheetGid: process.env.SHEET_GID ? Number(process.env.SHEET_GID) : null,
  /** gid 대신 탭명으로 지정할 때 사용 */
  sheetTabName: process.env.SHEET_TAB_NAME ?? null,
  /** 실제 헤더 행 (1-base) */
  headerRow: num(process.env.HEADER_ROW, 3),
  /** 실제 데이터 시작 행 (1-base) */
  dataStartRow: num(process.env.DATA_START_ROW, 4),
} as const

/**
 * 필드 → 헤더 별칭 목록.
 * 헤더 행에서 (공백 제거 후) 별칭 중 하나를 "포함"하는 첫 컬럼을 해당 필드로 매핑.
 * personKey/consultedAt/triage/record 는 필수에 가깝고, 나머지는 보완용(H가 비었을 때).
 */
export const FIELD_ALIASES: Record<string, string[]> = {
  personKey: ['성명생년월일', '성명/생년월일', '성명·생년월일', '대상자', '성명'],
  consultedAt: ['상담일시', '상담일자', '상담시각', '일시'],
  triage: ['트리아지', 'triage'],
  record: ['방문결과등록서식', '방문결과 등록서식', '등록서식', '방문결과'],
  // 보완용 (record(H)가 비었을 때 합성)
  partyCode: ['당사자코드'],
  currentChange: ['과거와다른상황', '과거와 다른 상황'],
  history: ['기존병력또는배경', '기존병력', '배경'],
  assessment: ['평가및요청', '평가 및 요청'],
  visitor: ['방문자'],
}

export type FieldKey = keyof typeof FIELD_ALIASES

/** 헤더 정규화: 공백/개행/특수공백 제거 후 비교 */
function normHeader(s: string): string {
  return (s ?? '').replace(/[\s​]+/g, '').trim()
}

export interface ColumnMap {
  /** 필드명 → 컬럼 인덱스(0-base). 미발견 시 undefined */
  index: Partial<Record<FieldKey, number>>
  /** 인식한 헤더 원문 (로그/디버그용) */
  recognizedHeaders: string[]
}

/**
 * 헤더 행에서 컬럼 매핑을 만든다.
 * @param header 헤더 행 셀 배열
 */
export function resolveColumns(header: string[]): ColumnMap {
  const normed = header.map(normHeader)
  const index: Partial<Record<FieldKey, number>> = {}

  for (const field of Object.keys(FIELD_ALIASES) as FieldKey[]) {
    const aliases = FIELD_ALIASES[field].map(normHeader)
    const col = normed.findIndex((h) => h && aliases.some((a) => h.includes(a)))
    if (col >= 0) index[field] = col
  }

  return { index, recognizedHeaders: header.map((h) => h?.trim() ?? '') }
}
