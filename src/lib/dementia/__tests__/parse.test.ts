import { describe, it, expect } from 'vitest'
import {
  parsePersonKey,
  parseTriage,
  parseConsultedAt,
  parseActionLine,
  parseActions,
  isResolvedStatus,
  buildRecord,
  consultedAtDisplay,
} from '../parse'
import { maskName, maskBirthCode, maskPersonLabel } from '../mask'
import { matchPerson, toChosung } from '../search'
import { resolveColumns } from '@/config/dementia-fieldmap'

describe('parsePersonKey (§2.1)', () => {
  it('성명+생년월일코드 분해', () => {
    const r = parsePersonKey('이순금480115')
    expect(r.name).toBe('이순금')
    expect(r.birthCode).toBe('480115')
    expect(r.personKey).toBe('이순금480115')
    expect(r.warning).toBeNull()
  })

  it('다음 줄 상담일시는 무시하고 첫 줄만 키로', () => {
    const r = parsePersonKey('이순금480115\n2026-06-25 14:30')
    expect(r.personKey).toBe('이순금480115')
  })

  it('형식 불일치는 버리지 않고 경고', () => {
    const r = parsePersonKey('미상')
    expect(r.warning).toBeTruthy()
    expect(r.birthCode).toBe('')
  })
})

describe('parseTriage', () => {
  it('숫자 추출', () => expect(parseTriage('2')).toBe(2))
  it('공백/0 = 0', () => {
    expect(parseTriage('')).toBe(0)
    expect(parseTriage('0')).toBe(0)
  })
})

describe('parseConsultedAt', () => {
  it('표준 형식 정렬키', () => {
    const a = parseConsultedAt('2026-06-25 14:30')
    const b = parseConsultedAt('2026-06-24 09:00')
    expect(a).toBeGreaterThan(b)
  })
  it('오후 표기 처리', () => {
    expect(parseConsultedAt('2026-06-25 오후 2:30')).toBe(
      parseConsultedAt('2026-06-25 14:30'),
    )
  })
  it('파싱 실패 0', () => expect(parseConsultedAt('미상')).toBe(0))
})

describe('parseActionLine (§2.2)', () => {
  it('코드+조치+기관+기한+해결여부', () => {
    const a = parseActionLine(
      '[2026-06-25] 251천원택시(서구) (기한: 2026-07-25 / 해결여부: 신규_요청)',
    )!
    expect(a.actionDate).toBe('2026-06-25')
    expect(a.code).toBe('251')
    expect(a.actionText).toBe('천원택시')
    expect(a.org).toBe('서구')
    expect(a.dueDate).toBe('2026-07-25')
    expect(a.status).toBe('신규_요청')
    expect(a.resolved).toBe(false)
  })

  it('해결여부 공백 가능', () => {
    const a = parseActionLine(
      '[2026-06-01] 131방문운동(재활) (기한: 2026-06-10 / 해결여부: )',
    )!
    expect(a.status).toBe('')
    expect(a.dueDate).toBe('2026-06-10')
    expect(a.resolved).toBe(false)
  })

  it('비매칭 줄은 null', () => {
    expect(parseActionLine('그냥 메모')).toBeNull()
  })
})

describe('parseActions', () => {
  it('# 사례회의 결과 아래만 추출', () => {
    const text = [
      '# 상담 요약',
      '[2026-06-25] 무관한 줄',
      '# 사례회의 결과',
      '[2026-06-25] 251천원택시(서구) (기한: 2026-07-25 / 해결여부: 신규_요청)',
      '[2026-06-01] 131방문운동(재활) (기한: 2026-06-10 / 해결여부: 완료)',
    ].join('\n')
    const items = parseActions(text)
    expect(items).toHaveLength(2)
    expect(items[1].resolved).toBe(true)
  })
})

describe('isResolvedStatus', () => {
  it('완료/해결 = true', () => {
    expect(isResolvedStatus('완료')).toBe(true)
    expect(isResolvedStatus('해결됨')).toBe(true)
  })
  it('공백/신규_요청/진행 = false', () => {
    expect(isResolvedStatus('')).toBe(false)
    expect(isResolvedStatus('신규_요청')).toBe(false)
    expect(isResolvedStatus('진행')).toBe(false)
  })
})

describe('mask (§4.2)', () => {
  it('이름 마스킹', () => expect(maskName('이순금')).toBe('이○○'))
  it('외자 처리', () => expect(maskName('김')).toBe('김○'))
  it('생년월일코드 마스킹', () => expect(maskBirthCode('480115')).toBe('48****'))
  it('라벨', () => expect(maskPersonLabel('이순금', '480115')).toBe('이○○48****'))
})

describe('search', () => {
  it('초성 변환', () => expect(toChosung('이순금')).toBe('ㅇㅅㄱ'))
  it('성명 부분일치', () => expect(matchPerson('순', '이순금', '480115', '이순금480115')).toBe(true))
  it('코드 일치', () => expect(matchPerson('4801', '이순금', '480115', '이순금480115')).toBe(true))
  it('초성 일치', () => expect(matchPerson('ㅇㅅㄱ', '이순금', '480115', '이순금480115')).toBe(true))
  it('불일치', () => expect(matchPerson('박', '이순금', '480115', '이순금480115')).toBe(false))
})

describe('consultedAtDisplay', () => {
  it('성명생년월일+상담일시 합친 칸에서 날짜만', () => {
    expect(consultedAtDisplay('이순금480115\n2026-06-25 15:22')).toBe('2026-06-25 15:22')
  })
  it('날짜만 있으면 그대로', () => {
    expect(consultedAtDisplay('2026-06-25 14:30')).toBe('2026-06-25 14:30')
  })
  it('빈값', () => expect(consultedAtDisplay('')).toBe(''))
})

// gid 1496494699 구조: 1행 라벨, 3행 헤더(상담일시/트리아지/등록서식), A열=키+일시
describe('계산 탭(gid 1496494699) 레이아웃', () => {
  const rows: string[][] = [
    ['성명생년월일', '이순금480115'], // 1행 라벨
    [], // 2행 빈줄
    ['상담일시', '트리아지', '', '', '', '', '', '방문결과 등록서식'], // 3행 헤더
    [
      '이순금480115\n2026-06-25 15:22',
      '0',
      '', '', '', '', '',
      '# 시니어간호사 방문상담\n□ 당사자 및 상담일시: 이순금480115\n2026-06-25 15:22\n□ 방문자: 윤종성\n==============================\n# 사례회의 결과\n□ [2026-06-01] 131방문운동(재활) (기한: 2026-06-10 / 해결여부: )',
    ], // 4행 데이터
  ]

  it('헤더는 3행(구조 점수)으로, 데이터는 4행부터', () => {
    // detectHeader는 sheets.ts에 있으나 로직 동치 검증: 3행이 상담일시/트리아지/등록서식 보유
    const { index } = resolveColumns(rows[2])
    expect(index.consultedAt).toBe(0)
    expect(index.triage).toBe(1)
    expect(index.record).toBe(7)
    expect(index.personKey).toBeUndefined() // 3행엔 성명생년월일 헤더 없음
  })

  it('성명생년월일을 A열(상담일시 컬럼)에서 폴백 추출', () => {
    const { index } = resolveColumns(rows[2])
    if (index.personKey == null && index.consultedAt != null) index.personKey = index.consultedAt
    const rec = buildRecord(rows[3], index, 4)
    expect(rec.name).toBe('이순금')
    expect(rec.birthCode).toBe('480115')
    expect(rec.consultedAt).toBe('2026-06-25 15:22') // 날짜만 표시
    expect(rec.triage).toBe(0)
    expect(rec.record).toContain('방문자: 윤종성')
    expect(rec.actions).toHaveLength(1)
    expect(rec.actions[0].code).toBe('131')
    expect(rec.actions[0].actionText).toBe('방문운동')
    expect(rec.actions[0].org).toBe('재활')
    expect(rec.actions[0].dueDate).toBe('2026-06-10')
    expect(rec.actions[0].resolved).toBe(false) // 해결여부 공백
  })
})

describe('resolveColumns + buildRecord (§1, §2)', () => {
  // 3행 헤더 가정
  const header = [
    '상담일시', '트리아지', '당사자코드', '과거와 다른 상황',
    '기존병력 또는 배경', '평가 및 요청', '성명생년월일', '방문결과 등록서식', '방문자',
  ]
  const { index } = resolveColumns(header)

  it('헤더 이름으로 컬럼 매핑', () => {
    expect(index.consultedAt).toBe(0)
    expect(index.triage).toBe(1)
    expect(index.personKey).toBe(6)
    expect(index.record).toBe(7)
  })

  it('행 → VisitRecord (조치 포함)', () => {
    const row = [
      '2026-06-25 14:30', '2', '', '', '', '',
      '이순금480115',
      '# 상담 요약\n특이사항 없음\n# 사례회의 결과\n[2026-06-25] 251천원택시(서구) (기한: 2026-07-25 / 해결여부: 신규_요청)',
      '홍길동',
    ]
    const rec = buildRecord(row, index, 4)
    expect(rec.name).toBe('이순금')
    expect(rec.triage).toBe(2)
    expect(rec.actions).toHaveLength(1)
    expect(rec.actions[0].actionText).toBe('천원택시')
    expect(rec.record).toContain('방문자: 홍길동')
  })

  it('H 비었을 때 개별 컬럼으로 record 합성', () => {
    const row = [
      '2026-06-25 14:30', '1', '', '낙상 증가', '고혈압', '재활 요청',
      '김갑동500303', '', '',
    ]
    const rec = buildRecord(row, index, 5)
    expect(rec.record).toContain('과거와 다른 상황')
    expect(rec.record).toContain('낙상 증가')
  })
})
