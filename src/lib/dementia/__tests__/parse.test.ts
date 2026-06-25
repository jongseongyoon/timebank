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
  normalizeDate,
  buildTodoAction,
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

describe('normalizeDate', () => {
  it('yy → 20yy', () => expect(normalizeDate('26-03-18')).toBe('2026-03-18'))
  it('yyyy 유지', () => expect(normalizeDate('2026-3-1')).toBe('2026-03-01'))
  it('점 구분', () => expect(normalizeDate('26.4.6')).toBe('2026-04-06'))
  it('빈값 null', () => expect(normalizeDate('')).toBeNull())
})

describe('buildTodoAction (사례회의 TODO 행 → 조치)', () => {
  // A 성명생년월일 · B 결정일 · C 돌봄서비스 · D TO-BE · E 처리기한 · F 담당 · G 비고 · H 해결여부
  const cols = { decidedDate: 1, service: 2, dueDate: 4, owner: 5, status: 7 }

  it('코드·내용·기관·기한·해결여부 분해(yy 날짜 정규화)', () => {
    const row = ['나종여400904', '26-03-18', '251천원택시(서구)', '', '26-03-27', '발화자5', '', '']
    const a = buildTodoAction(row, cols)!
    expect(a.code).toBe('251')
    expect(a.actionText).toBe('천원택시')
    expect(a.org).toBe('서구')
    expect(a.actionDate).toBe('2026-03-18')
    expect(a.dueDate).toBe('2026-03-27')
    expect(a.resolved).toBe(false) // 해결여부 공백
  })

  it('기관 괄호 없으면 담당을 기관으로', () => {
    const row = ['유춘자390115', '26-03-16', '153치매조기사례관리', '', '26-04-06', '사례관리', '', '완료']
    const a = buildTodoAction(row, cols)!
    expect(a.code).toBe('153')
    expect(a.actionText).toBe('치매조기사례관리')
    expect(a.org).toBe('사례관리')
    expect(a.resolved).toBe(true)
  })

  it('빈 행은 null', () => {
    expect(buildTodoAction(['김갑동', '', '', '', '', '', '', ''], cols)).toBeNull()
  })
})

// 마스터 폼 응답 탭(gid 940998687): 1행 분류 + 2행 질문 헤더, 3행~ 데이터
describe('마스터 탭 레이아웃 + 등록서식 재구성', () => {
  // A 타임스탬프 · C 어르신이름 · D 섭식 · E 정신 · Q 상황 · R 기존 · S 평가 · T 작성 · U 트리아지
  const row1 = ['', '', '코드번호', '섭식', '정신', '상황', '기존', '평가요청', '작성', '트리아지']
  const row2 = ['타임스탬프', '', '어르신의 이름', '섭식', '정신', '(과거와 다른 상황)', '(기존 병력이나 배경)', '(평가 및 요청)', '(작성자)', '1열']
  // 합친 헤더
  const header = row1.map((c, i) => [c, row2[i]].filter(Boolean).join(' '))
  const colMap = resolveColumns(header)

  it('합친 헤더로 컬럼 매핑', () => {
    expect(colMap.index.consultedAt).toBe(0) // 타임스탬프
    expect(colMap.index.personKey).toBe(2) // 어르신 이름
    expect(colMap.index.currentChange).toBe(5)
    expect(colMap.index.history).toBe(6)
    expect(colMap.index.assessment).toBe(7)
    expect(colMap.index.visitor).toBe(8)
    expect(colMap.index.triage).toBe(9)
    expect(colMap.monitoring.map((m) => m.label)).toEqual(['섭식', '정신'])
  })

  it('등록서식 재구성(H 없음) + 주의/관찰 강조', () => {
    const row = [
      '2026. 5. 12 오후 4:05:25', '', '송연순490813',
      '안정/유지', '주의/관찰',
      '작년에 배우자 돌아가심', '치매 고혈압', '해당없음', '김혜정', '1',
    ]
    const rec = buildRecord(row, colMap, 3)
    expect(rec.name).toBe('송연순')
    expect(rec.birthCode).toBe('490813')
    expect(rec.consultedAt).toContain('2026. 5. 12')
    expect(rec.triage).toBe(1)
    expect(rec.record).toContain('# 시니어간호사 방문상담')
    expect(rec.record).toContain('당사자 및 상담일시: 송연순490813')
    expect(rec.record).toContain('트리아지: 1점')
    expect(rec.record).toContain('주의/관찰: 정신(주의/관찰)') // 비정상 항목만 강조
    expect(rec.record).toContain('과거와 다른 현재 상황: 작년에 배우자 돌아가심')
    expect(rec.record).toContain('방문자: 김혜정')
  })
})
