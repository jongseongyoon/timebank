/**
 * 구글 시트 연계 유틸리티
 *
 * 개인정보 최소화 원칙:
 *  - 구글 시트: 이름·전화·생년월일·동·대상구분·비고만
 *  - Supabase: 앱 작동에 필요한 전체 정보
 */

import { DONGS } from '@/lib/constants'

// ── URL 변환 ──────────────────────────────────────────────────────────────────
// https://docs.google.com/spreadsheets/d/ID/edit
//   → https://docs.google.com/spreadsheets/d/ID/export?format=csv
export function getSheetCsvUrl(sheetUrl: string): string {
  const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  if (!match) throw new Error('올바른 구글 시트 URL이 아닙니다.')
  return `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`
}

// ── 시트 행 타입 ──────────────────────────────────────────────────────────────
export interface SheetRow {
  rowIndex:  number   // 구글 시트 행 번호 (2행부터 시작)
  name:      string
  phone:     string
  birthDate: string   // YYYY-MM-DD
  dong:      string
  role:      string   // 수요자 | 제공자 | 둘다
  note:      string
  status:    string   // 빈칸 | 완료 | 수정 | 삭제
  timepayId: string   // H열: TimePay ID (자동 입력)
}

// ── CSV 파싱 ──────────────────────────────────────────────────────────────────
// 쉼표가 포함된 필드는 큰따옴표로 감싸져 있으므로 단순 split 대신 상태 머신 파싱
function parseCsvLine(line: string): string[] {
  const cols: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      cols.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  cols.push(current.trim())
  return cols
}

export function parseSheetCsv(csvText: string): SheetRow[] {
  // Windows/Mac 줄바꿈 통일
  const lines = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n')
  const rows: SheetRow[] = []

  // 첫 줄(헤더) 건너뜀
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const cols = parseCsvLine(line)
    const name  = cols[0] ?? ''
    const phone = cols[1] ?? ''
    if (!name && !phone) continue  // 완전히 빈 행 건너뜀

    rows.push({
      rowIndex:  i + 1,            // 구글 시트 행 번호 (헤더=1행, 데이터=2행~)
      name,
      phone,
      birthDate: cols[2] ?? '',
      dong:      cols[3] ?? '',
      role:      cols[4] ?? '수요자',
      note:      cols[5] ?? '',
      status:    cols[6] ?? '',    // G열: 빈칸/완료/수정/삭제
      timepayId: cols[7] ?? '',    // H열: TimePay ID
    })
  }
  return rows
}

// ── 전화번호 정규화 ───────────────────────────────────────────────────────────
// 010-1234-5678 형식으로 통일
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  }
  return phone.trim()
}

// ── 대상구분 → DB Role[] 변환 ─────────────────────────────────────────────────
export function parseRole(role: string): string[] {
  if (role === '수요자') return ['RECEIVER']
  if (role === '제공자') return ['PROVIDER']
  if (role === '둘다')   return ['RECEIVER', 'PROVIDER']
  return ['RECEIVER']
}

// ── 유효성 검사 ───────────────────────────────────────────────────────────────
// 반환값: null = 정상, string = 오류 메시지
export function validateRow(row: SheetRow): string | null {
  if (!row.name)  return '이름 없음'
  if (!row.phone) return '전화번호 없음'

  const phone = normalizePhone(row.phone)
  if (!/^010-\d{4}-\d{4}$/.test(phone)) {
    return `전화번호 형식 오류: ${row.phone} (예: 010-1234-5678)`
  }

  if (!row.birthDate) return '생년월일 없음'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(row.birthDate)) {
    return `생년월일 형식 오류: ${row.birthDate} (YYYY-MM-DD 형식 필요)`
  }

  const [y, m, d] = row.birthDate.split('-').map(Number)
  if (y < 1900 || y > new Date().getFullYear()) return `생년 범위 오류: ${y}`
  if (m < 1 || m > 12) return `월 범위 오류: ${m}`
  if (d < 1 || d > 31) return `일 범위 오류: ${d}`

  if (!DONGS.includes(row.dong)) {
    return `동 오류: "${row.dong}" — 유효한 동 목록을 확인하세요`
  }

  const validRoles = ['수요자', '제공자', '둘다']
  if (!validRoles.includes(row.role)) {
    return `대상구분 오류: "${row.role}" (수요자/제공자/둘다 중 선택)`
  }

  return null
}

// ── 임시 비밀번호 생성 ────────────────────────────────────────────────────────
// 생년월일 뒤 6자리: 1945-03-15 → "450315"
export function getTempPassword(birthDate: string): string {
  return birthDate.replace(/-/g, '').slice(2, 8)
}

// ── TP 만료일 계산 ────────────────────────────────────────────────────────────
// 65세 이상: 10년, 미만: 5년
export function calcTpExpiresAt(birthDate: string): Date {
  const birthYear = parseInt(birthDate.slice(0, 4), 10)
  const age = new Date().getFullYear() - birthYear
  const years = age >= 65 ? 10 : 5
  const d = new Date()
  d.setFullYear(d.getFullYear() + years)
  return d
}
