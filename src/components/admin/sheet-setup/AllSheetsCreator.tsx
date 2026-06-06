import { useState } from 'react'
import { RefreshCw, Layers, AlertTriangle, CheckCircle2, XCircle, ExternalLink } from 'lucide-react'

interface CreateResult { dong: string; ok: boolean; url?: string; sheetId?: number; error?: string }

interface Props {
  dongCount: number
  apiOk:     boolean
  onCreated: () => void
}

export function AllSheetsCreator({ dongCount, apiOk, onCreated }: Props) {
  const [allCreating,  setAllCreating]  = useState(false)
  const [allResults,   setAllResults]   = useState<CreateResult[] | null>(null)
  const [allError,     setAllError]     = useState<string | null>(null)
  const [confirmAll,   setConfirmAll]   = useState(false)

  async function handleAll() {
    setAllError(null); setAllResults(null); setAllCreating(true); setConfirmAll(false)
    try {
      const res  = await fetch('/api/admin/sheet-setup/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'all' }),
      })
      const data = await res.json()
      if (!res.ok) { setAllError(data.error ?? '생성 실패'); return }
      setAllResults(data.results ?? [])
      onCreated()
    } catch (e: unknown) { setAllError(e instanceof Error ? e.message : '요청 실패') }
    finally { setAllCreating(false) }
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-semibold mb-1">📋 광주 서구 19개 동 + 관외 시트 일괄 생성</p>
        <ul className="list-disc list-inside space-y-0.5 text-xs text-blue-700">
          <li>각 동마다 드롭다운·색상·헤더가 설정된 시트를 생성합니다</li>
          <li>API 쿼터 제한으로 약 <strong>2~3분</strong> 소요됩니다</li>
          <li>이미 시트가 있는 동은 URL이 덮어쓰여집니다</li>
        </ul>
      </div>

      {!confirmAll ? (
        <button onClick={() => setConfirmAll(true)} disabled={!apiOk}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors">
          <Layers className="h-4 w-4" /> 전체 시트 생성하기
        </button>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-amber-800 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            정말 전체 {dongCount}개 동 시트를 생성하시겠습니까?
          </p>
          <p className="text-xs text-amber-700">기존에 생성된 시트가 있어도 새로 만들어집니다.</p>
          <div className="flex gap-2">
            <button onClick={handleAll} disabled={allCreating}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors">
              {allCreating ? <><RefreshCw className="h-4 w-4 animate-spin" /> 생성 중...</> : '확인 — 전체 생성'}
            </button>
            <button onClick={() => setConfirmAll(false)} disabled={allCreating} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">취소</button>
          </div>
        </div>
      )}

      {allCreating && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <RefreshCw className="h-4 w-4 animate-spin text-blue-600" /> 시트 생성 중... (약 2~3분 소요)
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all animate-pulse" style={{ width: '100%' }} />
          </div>
        </div>
      )}

      {allError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-start gap-2">
          <XCircle className="h-4 w-4 mt-0.5 shrink-0" />{allError}
        </div>
      )}

      {allResults && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{allResults.filter(r => r.ok).length}</p>
              <p className="text-xs text-green-600 mt-0.5">✅ 생성 완료</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-red-700">{allResults.filter(r => !r.ok).length}</p>
              <p className="text-xs text-red-600 mt-0.5">❌ 실패</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead><tr className="bg-gray-50 border-b"><th className="px-3 py-2 text-left">동</th><th className="px-3 py-2 text-left">결과</th><th className="px-3 py-2 text-left">링크</th></tr></thead>
              <tbody>
                {allResults.map(r => (
                  <tr key={r.dong} className="border-b last:border-0">
                    <td className="px-3 py-1.5 font-medium">{r.dong}</td>
                    <td className="px-3 py-1.5">{r.ok ? <span className="text-green-700">✅ 완료</span> : <span className="text-red-600">❌ {r.error}</span>}</td>
                    <td className="px-3 py-1.5">
                      {r.ok && r.url && <a href={r.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1"><ExternalLink className="h-3 w-3" /> 열기</a>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
