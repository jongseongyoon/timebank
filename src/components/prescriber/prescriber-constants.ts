// 사회적처방 발급 화면 공용 상수

export const REASONS = [
  { value: '고독고립', label: '고독·고립' },
  { value: '이동불편', label: '이동불편' },
  { value: '경제취약', label: '경제취약' },
  { value: '건강악화', label: '건강악화' },
  { value: '인지저하', label: '인지저하' },
  { value: '기타',     label: '기타' },
] as const

export const SERVICES = [
  { value: 'TRANSPORT',      label: '이동지원' },
  { value: 'SHOPPING',       label: '장보기' },
  { value: 'COMPANION',      label: '말벗' },
  { value: 'MEAL',           label: '식사지원' },
  { value: 'HOUSEKEEPING',   label: '가사지원' },
  { value: 'MEDICAL_ESCORT', label: '의료동행' },
  { value: 'EDUCATION',      label: '교육' },
  { value: 'DIGITAL_HELP',   label: '디지털지원' },
  { value: 'OTHER',          label: '기타' },
] as const

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
