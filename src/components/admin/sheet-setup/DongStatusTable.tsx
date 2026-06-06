import { RefreshCw, ExternalLink, Plus } from 'lucide-react'

export interface DongStatus {
  dong:      string
  sheetUrl:  string | null
  createdAt: string | null
  lastSync:  { syncedAt: string; newCount: number; totalRows: number } | null
}

interface Props {
  dongStatus:    DongStatus[]
  statusLoad:    boolean
  loadStatus:    () => void
  onCreateDong:  (dong: string) => void
}

export function DongStatusTable({ dongStatus, statusLoad, loadStatus, onCreateDong }: Props) {
  return (
    <div className="bg-white border rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base">3. 동별 시트 현황</h2>
        <button onClick={loadStatus} disabled={statusLoad}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-40">
          <RefreshCw className={`h-3 w-3 ${statusLoad ? 'animate-spin' : ''}`} /> 새로고침
        </button>
      </div>
      {statusLoad ? (
        <p className="text-sm text-gray-400 text-center py-4">불러오는 중...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-3 py-2 text-left font-medium text-gray-600 w-20">동</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">구글 시트 URL</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600 w-28">마지막 동기화</th>
                <th className="px-3 py-2 text-center font-medium text-gray-600 w-20">열기</th>
              </tr>
            </thead>
            <tbody>
              {dongStatus.map(d => (
                <tr key={d.dong} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">{d.dong}</td>
                  <td className="px-3 py-2 text-gray-500 max-w-xs truncate">
                    {d.sheetUrl
                      ? <span className="font-mono text-xs">{d.sheetUrl.replace('https://docs.google.com/spreadsheets/d/', '…/')}</span>
                      : <span className="text-gray-300 italic">시트 없음</span>
                    }
                  </td>
                  <td className="px-3 py-2 text-gray-500">
                    {d.lastSync
                      ? new Date(d.lastSync.syncedAt).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })
                      : <span className="text-gray-300">미동기화</span>
                    }
                  </td>
                  <td className="px-3 py-2 text-center">
                    {d.sheetUrl ? (
                      <a href={d.sheetUrl} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors">
                        <ExternalLink className="h-3 w-3" /> 열기
                      </a>
                    ) : (
                      <button onClick={() => onCreateDong(d.dong)}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg transition-colors">
                        <Plus className="h-3 w-3" /> 생성
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
