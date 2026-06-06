import { ChevronLeft, ChevronRight } from 'lucide-react'
import { type MemberRow, ROLE_LABELS, ROLE_COLORS, STATUS_LABELS, STATUS_COLORS, fmtDate, fmtTP } from './types'

interface Props {
  members:      MemberRow[]
  listLoading:  boolean
  selectedId:   string | null
  page:         number
  totalPages:   number
  onSelect:     (id: string) => void
  onPageChange: (p: number) => void
}

export function MemberTable({ members, listLoading, selectedId, page, totalPages, onSelect, onPageChange }: Props) {
  if (listLoading) return <div className="flex items-center justify-center h-40 text-sm text-gray-400">로딩 중…</div>
  if (members.length === 0) return <div className="flex items-center justify-center h-40 text-sm text-gray-400">검색 결과가 없습니다.</div>

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr className="text-left text-xs text-gray-500 font-medium">
              <th className="px-4 py-3">이름</th><th className="px-4 py-3">전화번호</th>
              <th className="px-4 py-3">동</th><th className="px-4 py-3">역할</th>
              <th className="px-4 py-3">상태</th><th className="px-4 py-3 text-right">TP 잔액</th>
              <th className="px-4 py-3">가입일</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {members.map(m => (
              <tr key={m.id} onClick={() => onSelect(m.id)}
                className={`cursor-pointer hover:bg-blue-50 transition-colors ${selectedId === m.id ? 'bg-blue-50' : ''}`}>
                <td className="px-4 py-3 font-medium">{m.name}</td>
                <td className="px-4 py-3 text-gray-600 tabular-nums">{m.phone}</td>
                <td className="px-4 py-3 text-gray-600">{m.dong}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 flex-wrap">
                    {m.roles.map(r => (
                      <span key={r} className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${ROLE_COLORS[r] ?? 'bg-gray-100 text-gray-600'}`}>
                        {ROLE_LABELS[r] ?? r}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[m.status] ?? ''}`}>
                    {STATUS_LABELS[m.status] ?? m.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-medium">{fmtTP(m.tpBalance)}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{fmtDate(m.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="shrink-0 flex items-center justify-center gap-3 px-6 py-3 border-t bg-white text-sm">
          <button onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page === 1} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-gray-600">{page} / {totalPages}</span>
          <button onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
