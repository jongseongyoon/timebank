import { useState } from 'react'
import { RefreshCw, Plus, CheckCircle2, XCircle, ExternalLink } from 'lucide-react'
import type { DongStatus } from './DongStatusTable'

interface Props {
  dongStatus: DongStatus[]
  apiOk:      boolean
  selDong:    string
  setSelDong: (v: string) => void
  onCreated:  () => void
}

export function SingleSheetCreator({ dongStatus, apiOk, selDong, setSelDong, onCreated }: Props) {
  const [creating,     setCreating]     = useState(false)
  const [singleResult, setSingleResult] = useState<{ url: string; dong: string } | null>(null)
  const [singleError,  setSingleError]  = useState<string | null>(null)

  async function handleSingle() {
    if (!selDong) return
    setSingleError(null); setSingleResult(null); setCreating(true)
    try {
      const res  = await fetch('/api/admin/sheet-setup/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'single', dong: selDong }),
      })
      const data = await res.json()
      if (!res.ok) { setSingleError(data.error ?? '생성 실패'); return }
      setSingleResult({ url: data.url, dong: data.dong })
      onCreated()
    } catch (e: unknown) {
      setSingleError(e instanceof Error ? e.message : '요청 실패')
    } finally { setCreating(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-end">
        <div className="space-y-1.5 flex-1 max-w-xs">
          <label className="text-sm font-medium">동 선택</label>
          <select value={selDong}
            onChange={e => { setSelDong(e.target.value); setSingleResult(null); setSingleError(null) }}
            className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">선택...</option>
            {dongStatus.map(d => <option key={d.dong} value={d.dong}>{d.dong}{d.sheetUrl ? ' ✅' : ''}</option>)}
          </select>
        </div>
        <button onClick={handleSingle} disabled={!selDong || creating || !apiOk}
          className="h-10 flex items-center gap-2 px-5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
          {creating ? <><RefreshCw className="h-4 w-4 animate-spin" /> 생성 중...</> : <><Plus className="h-4 w-4" /> 시트 생성하기</>}
        </button>
      </div>

      {singleError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-start gap-2">
          <XCircle className="h-4 w-4 mt-0.5 shrink-0" />{singleError}
        </div>
      )}

      {singleResult && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-green-800 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />{singleResult.dong} 시트 생성 완료!
          </p>
          <a href={singleResult.url} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
            <ExternalLink className="h-3.5 w-3.5" /> 구글 시트 열기
          </a>
          <p className="text-xs text-green-600">코디네이터와 공유하려면 아래 "코디네이터 공유 방법" 안내를 참고하세요.</p>
        </div>
      )}

      {!apiOk && <p className="text-xs text-amber-600">⚠️ 구글 API 환경변수를 먼저 설정해야 시트를 생성할 수 있습니다.</p>}
    </div>
  )
}
