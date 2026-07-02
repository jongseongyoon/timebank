/**
 * 치매 모니터링 방문 조회 — 데이터 모델
 *
 * 회차 1건 = VisitRecord. 동일인은 personKey(성명생년월일)로 묶는다.
 * (명령서 §2 데이터 모델)
 */

/** 사례회의 조치 아이템 (§2.2) */
export interface ActionItem {
  actionDate: string        // [YYYY-MM-DD]
  code: string | null       // 선행 숫자코드 (예: 251)
  actionText: string        // 조치내용 (예: 천원택시)
  org: string | null        // 기관 (예: 서구)
  dueDate: string | null    // 기한: YYYY-MM-DD (공백 가능)
  status: string            // 해결여부 원문 (공백 가능)
  resolved: boolean         // 해결 완료로 볼 수 있는 상태인가
  raw: string               // 원본 한 줄
}

/** 회차 1건 */
export interface VisitRecord {
  rowIndex: number          // 원본 시트 행 번호(1-base)
  personKey: string         // 성명생년월일 원문 (예: 이순금480115)
  name: string              // 한글 성명
  birthCode: string         // 생년월일코드 6자리 (예: 480115)
  consultedAt: string       // 상담일시 표시 문자열
  consultedAtMs: number     // 정렬용 epoch(ms). 파싱 실패 시 0
  triage: number            // 트리아지 정수(0/공백 = 0)
  triageRaw: string         // 트리아지 원문
  record: string            // 방문결과 등록서식(H 수식 결과) 전체 텍스트
  actions: ActionItem[]     // record에서 추출한 조치 아이템
  parseWarning: string | null
}

/** 명단(대상자) 시트에서 보강한 기본정보 항목 (인물 상세 상단) */
export interface RosterField {
  label: string
  value: string
}

/** 인물 목록 카드용 요약 (목록은 마스킹된 형태로만 노출) */
export interface PersonSummary {
  personKey: string         // 상세 진입용 키 (서버에서만 원문 사용)
  maskedName: string        // 이○○
  maskedBirthCode: string   // 48****
  visitCount: number
  lastConsultedAt: string
  lastConsultedAtMs: number
  latestTriage: number      // 최근 회차 트리아지
  maxTriage: number         // 이력 중 최고 트리아지
  openActionCount: number   // 미해결 조치 수
  hasParseWarning: boolean
}

/** 팔로업 대시보드 행 (인물 마스킹 + 조치) */
export interface FollowupItem extends ActionItem {
  personKey: string
  maskedName: string
  consultedAt: string
  triage: number
  dueState: 'overdue' | 'soon' | 'later' | 'none'  // 기한 임박도
}

export interface RecordsResponse {
  people: PersonSummary[]
  total: number
  fetchedAt: string         // 마지막 데이터 갱신 시각 (ISO)
  warnings: string[]        // 데이터 품질 경고 메시지
  source: string            // 출처(시트/탭) 표시
}
