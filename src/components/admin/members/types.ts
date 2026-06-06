export interface MemberRow {
  id:         string
  name:       string
  phone:      string
  dong:       string
  roles:      string[]
  status:     string
  memberType: string
  tpBalance:  string
  createdAt:  string
  syncSource: string
  birthDate:  string | null
}

export interface MemberDetail extends MemberRow {
  email:          string | null
  address:        string | null
  isVulnerable:   boolean
  isDisabled:     boolean
  lifetimeEarned: string
  lifetimeSpent:  string
  tpExpiresAt:    string | null
  lastSyncedAt:   string | null
  avgRating:      string
  ratingCount:    number
  updatedAt:      string
  organization:   { id: string; name: string } | null
}

export const ROLE_LABELS: Record<string, string>   = { RECEIVER: '수요자', PROVIDER: '제공자', COORDINATOR: '코디', ADMIN: '관리자' }
export const STATUS_LABELS: Record<string, string> = { ACTIVE: '활성', DORMANT: '휴면', SUSPENDED: '정지', WITHDRAWN: '탈퇴' }
export const STATUS_COLORS: Record<string, string> = {
  ACTIVE:    'bg-green-100 text-green-800',
  DORMANT:   'bg-yellow-100 text-yellow-800',
  SUSPENDED: 'bg-red-100 text-red-800',
  WITHDRAWN: 'bg-gray-100 text-gray-500',
}
export const ROLE_COLORS: Record<string, string> = {
  RECEIVER:    'bg-blue-100 text-blue-700',
  PROVIDER:    'bg-indigo-100 text-indigo-700',
  COORDINATOR: 'bg-purple-100 text-purple-700',
  ADMIN:       'bg-rose-100 text-rose-700',
}
export const ALL_ROLES     = ['RECEIVER', 'PROVIDER', 'COORDINATOR', 'ADMIN']
export const ALL_STATUSES  = ['ACTIVE', 'DORMANT', 'SUSPENDED', 'WITHDRAWN']

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' })
}
export function fmtBirth(s: string | null) {
  if (!s || s.length < 8) return '-'
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
}
export function fmtTP(v: string | number) {
  return `${Number(v).toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} TP`
}
