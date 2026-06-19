// 사회적처방 발급 화면 공용 상수
import { SERVICE_CATEGORY_MAP } from '@/lib/constants'

export const REASONS = [
  { value: '고독고립', label: '고독·고립' },
  { value: '이동불편', label: '이동불편' },
  { value: '경제취약', label: '경제취약' },
  { value: '건강악화', label: '건강악화' },
  { value: '인지저하', label: '인지저하' },
  { value: '기타',     label: '기타' },
] as const

// 서비스 유형: 정본 SERVICE_CATEGORY_MAP에서 파생 (서비스 등록 화면과 항상 동일)
export const SERVICES = Object.entries(SERVICE_CATEGORY_MAP).map(
  ([value, label]) => ({ value, label }),
)

export { DONGS } from '@/lib/constants'

export interface NewReceiverForm {
  name:         string
  phone:        string
  birthDate:    string   // YYYYMMDD
  dong:         string
  address:      string
  isVulnerable: boolean
  isDisabled:   boolean
}

export function emptyReceiver(): NewReceiverForm {
  return {
    name: '', phone: '', birthDate: '', dong: '',
    address: '', isVulnerable: false, isDisabled: false,
  }
}
