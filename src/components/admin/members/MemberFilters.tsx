import { Search, X, RefreshCw } from 'lucide-react'
import { DONGS } from '@/lib/constants'
import { ROLE_LABELS, STATUS_LABELS, ALL_ROLES, ALL_STATUSES } from './types'

interface Props {
  search:        string
  filterDong:    string
  filterRole:    string
  filterStatus:  string
  setSearch:     (v: string) => void
  setFilterDong: (v: string) => void
  setFilterRole: (v: string) => void
  setFilterStatus: (v: string) => void
  onReset:       () => void
  onRefresh:     () => void
}

export function MemberFilters({
  search, filterDong, filterRole, filterStatus,
  setSearch, setFilterDong, setFilterRole, setFilterStatus,
  onReset, onRefresh,
}: Props) {
  return (
    <div className="px-6 py-4 border-b bg-white space-y-3 shrink-0">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="이름 또는 전화번호로 검색"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="flex gap-2 flex-wrap">
        <select className="text-sm border rounded-md px-2 py-1.5" value={filterDong} onChange={e => setFilterDong(e.target.value)}>
          <option value="">동 전체</option>
          {DONGS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select className="text-sm border rounded-md px-2 py-1.5" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
          <option value="">역할 전체</option>
          {ALL_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
        <select className="text-sm border rounded-md px-2 py-1.5" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">상태 전체</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <button onClick={onReset} className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 px-2 py-1 border rounded-md">
          <X className="h-3 w-3" /> 초기화
        </button>
        <button onClick={onRefresh} className="ml-auto text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
          <RefreshCw className="h-3 w-3" /> 새로고침
        </button>
      </div>
    </div>
  )
}
