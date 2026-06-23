// 착한가게 일괄 등록용 파싱 및 검증
import { DONGS } from '@/lib/constants'

export interface StoreSheetRow {
  rowIndex:     number
  storeName:    string
  ownerName:    string
  phone:        string
  address:      string
  dong:         string
  category:     string
  bankName:     string
  accountNo:    string
  accountHolder: string
  status:       string
}

export interface ParsedStoreRow extends StoreSheetRow {
  normalizedPhone: string
  validationError: string | null   // null = 정상, '⚠️...' = 경고, 그 외 = 오류
}

// CSV 파싱 (헤더 1행 건너뜀)
export function parseStoreCsv(csvText: string): StoreSheetRow[] {
  const lines = csvText.trim().split('\n')
  const rows: StoreSheetRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''))
    if (!cols[0] && !cols[2]) continue // 빈 행 스킵

    rows.push({
      rowIndex:     i + 1,
      storeName:    cols[0] || '',
      ownerName:    cols[1] || '',
      phone:        cols[2] || '',
      address:      cols[3] || '',
      dong:         cols[4] || '',
      category:     cols[5] || '기타',
      bankName:     cols[6] || '',
      accountNo:    cols[7] || '',
      accountHolder: cols[8] || '',
      status:       cols[9] || '',
    })
  }
  return rows
}

export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 11) return `${digits.slice(0,3)}-${digits.slice(3,7)}-${digits.slice(7)}`
  if (digits.length === 10) return `${digits.slice(0,3)}-${digits.slice(3,6)}-${digits.slice(6)}`
  return raw
}

// 검증: null=정상, '⚠️...'=경고(등록 가능), 그 외=오류(등록 불가)
export function validateStoreRow(row: StoreSheetRow): string | null {
  if (!row.storeName?.trim()) return '가게명 없음'
  if (!row.ownerName?.trim()) return '사장님명 없음'
  if (!row.phone?.trim())     return '전화번호 없음'

  const digits = row.phone.replace(/\D/g, '')
  if (digits.length < 10 || digits.length > 11) return `전화번호 형식 오류: ${row.phone}`

  if (!row.address?.trim()) return '주소 없음'

  if (!DONGS.includes(row.dong as typeof DONGS[number])) {
    return `동 오류: "${row.dong}" (유효한 동 아님)`
  }

  if (!row.bankName?.trim())     return '은행명 없음 (계좌 검증 필요)'
  if (!row.accountNo?.trim())    return '계좌번호 없음 (계좌 검증 필요)'
  if (!row.accountHolder?.trim()) return '예금주명 없음 (계좌 검증 필요)'

  // 예금주 ≠ 사장님 → 경고만 (대리계좌 가능성, 수동 확인 후 등록 허용)
  if (row.accountHolder.trim() !== row.ownerName.trim()) {
    return `⚠️확인필요: 예금주(${row.accountHolder})와 사장님명(${row.ownerName})이 다름`
  }

  return null
}

// 행 전체 파싱+검증 (미리보기용)
export function parseAndValidate(csvText: string): ParsedStoreRow[] {
  return parseStoreCsv(csvText).map(row => ({
    ...row,
    normalizedPhone: normalizePhone(row.phone),
    validationError: validateStoreRow(row),
  }))
}
