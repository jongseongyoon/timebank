// ─────────────────────────────────────────────
// 서비스 카테고리 한국어 매핑
// ─────────────────────────────────────────────

export const SERVICE_CATEGORY_MAP: Record<string, string> = {
  TRANSPORT:       '이동지원',
  SHOPPING:        '장보기',
  COMPANION:       '말벗',
  MEAL:            '식사지원',
  HOUSEKEEPING:    '가사지원',
  MEDICAL_ESCORT:  '의료동행',
  EDUCATION:       '교육',
  DIGITAL_HELP:    '디지털지원',
  REPAIR:          '수리',
  CHILDCARE:       '아이돌봄',
  LEGAL_CONSULT:   '법률상담',
  HEALTH_CONSULT:  '건강상담',
  ADMINISTRATIVE:  '행정보조',
  COMMUNITY_EVENT: '공동체행사',
  OTHER:           '기타',
}

export function getCategoryLabel(category: string): string {
  return SERVICE_CATEGORY_MAP[category] || category
}

// ─────────────────────────────────────────────
// 서비스 지역 동 목록
// ─────────────────────────────────────────────

export const DONGS = [
  '양동', '양3동', '농성1동', '농성2동', '광천동',
  '유덕동', '치평동', '상무1동', '상무2동', '화정1동',
  '화정2동', '화정3동', '화정4동', '서창동', '금호1동',
  '금호2동', '풍암동', '동천동', '관외',
]

// ─────────────────────────────────────────────
// 돌봄 필요도 5단계
// ─────────────────────────────────────────────

export const CARE_LEVELS = [
  {
    level: 1,
    label: '자립',
    description: '혼자서 모든 일상생활 가능',
    color: '#2f9e44',
    bgColor: '#ebfbee',
    icon: '🟢',
    careNeeds: '정기적 안부 확인 정도',
  },
  {
    level: 2,
    label: '경도 의존',
    description: '일부 도움으로 생활 가능',
    color: '#1971c2',
    bgColor: '#e7f5ff',
    icon: '🔵',
    careNeeds: '간헐적 도움 서비스 필요',
  },
  {
    level: 3,
    label: '중등도 의존',
    description: '대부분의 일상에 도움 필요',
    color: '#e67700',
    bgColor: '#fff9db',
    icon: '🟡',
    careNeeds: '정기적 방문 서비스 필요',
  },
  {
    level: 4,
    label: '고도 의존',
    description: '거의 모든 활동에 도움 필요',
    color: '#e8590c',
    bgColor: '#fff4e6',
    icon: '🟠',
    careNeeds: '집중적 돌봄 서비스 필요',
  },
  {
    level: 5,
    label: '완전 의존',
    description: '24시간 상시 돌봄 필요',
    color: '#c92a2a',
    bgColor: '#fff5f5',
    icon: '🔴',
    careNeeds: '전문 요양 서비스 연계 필요',
  },
]

export function getCareLevel(level: number) {
  return CARE_LEVELS.find(c => c.level === level) ?? CARE_LEVELS[0]
}

export function getCareStars(level: number): string {
  return '★'.repeat(level) + '☆'.repeat(5 - level)
}
