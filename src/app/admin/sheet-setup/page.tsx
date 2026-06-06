'use client'

import { useEffect, useState } from 'react'
import { Sheet, CheckCircle2, XCircle, AlertTriangle, Plus, Layers } from 'lucide-react'
import { SetupGuide }        from '@/components/admin/sheet-setup/SetupGuide'
import { ShareGuide }        from '@/components/admin/sheet-setup/ShareGuide'
import { DongStatusTable, type DongStatus } from '@/components/admin/sheet-setup/DongStatusTable'
import { SingleSheetCreator } from '@/components/admin/sheet-setup/SingleSheetCreator'
import { AllSheetsCreator }   from '@/components/admin/sheet-setup/AllSheetsCreator'

interface ApiStatus { hasServiceEmail: boolean; hasPrivateKey: boolean; hasMasterSheetId: boolean }

function StatusIcon({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 text-sm ${ok ? 'text-green-700' : 'text-red-600'}`}>
      {ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
      {label}
    </div>
  )
}

export default function SheetSetupPage() {
  const [apiStatus,  setApiStatus]  = useState<ApiStatus | null>(null)
  const [dongStatus, setDongStatus] = useState<DongStatus[]>([])
  const [statusLoad, setStatusLoad] = useState(true)
  const [tab,        setTab]        = useState<'single' | 'all'>('single')
  const [selDong,    setSelDong]    = useState('')

  async function loadStatus() {
    setStatusLoad(true)
    try {
      const res  = await fetch('/api/admin/sheet-setup/status')
      const data = await res.json()
      if (res.ok) { setApiStatus(data.apiStatus); setDongStatus(data.dongStatus ?? []) }
    } catch {}
    setStatusLoad(false)
  }

  useEffect(() => { loadStatus() }, [])

  function handleCreateDong(dong: string) {
    setTab('single'); setSelDong(dong); window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const apiOk = apiStatus?.hasServiceEmail && apiStatus?.hasPrivateKey && apiStatus?.hasMasterSheetId

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sheet className="h-6 w-6 text-green-600" /> 구글 시트 탭 설정
        </h1>
        <p className="text-sm text-muted-foreground mt-1">마스터 스프레드시트에 동별 탭(워크시트)을 추가하고 헤더·서식을 세팅합니다.</p>
      </div>

      {/* 1. API 상태 */}
      <div className="bg-white border rounded-xl p-5 space-y-3">
        <h2 className="font-semibold text-base">1. 구글 API 설정 상태</h2>
        {statusLoad ? <p className="text-sm text-gray-400">확인 중...</p>
          : apiStatus ? (
            <div className="space-y-2">
              <StatusIcon ok={apiStatus.hasServiceEmail}  label="서비스 계정 이메일 (GOOGLE_SERVICE_ACCOUNT_EMAIL)" />
              <StatusIcon ok={apiStatus.hasPrivateKey}    label="서비스 계정 키 (GOOGLE_PRIVATE_KEY)" />
              <StatusIcon ok={apiStatus.hasMasterSheetId} label="마스터 시트 ID (GOOGLE_MASTER_SHEET_ID)" />
              {!apiOk && (
                <div className="mt-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  위 항목 중 미설정 값이 있으면 탭을 생성할 수 없습니다. 아래 설정 안내를 펼쳐 확인하세요.
                </div>
              )}
            </div>
          ) : <p className="text-sm text-red-500">상태 조회 실패</p>
        }
      </div>

      <SetupGuide />

      {/* 2. 동 탭 추가 */}
      <div className="bg-white border rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-base">2. 동 탭 추가</h2>
        <div className="flex border-b">
          {(['single', 'all'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t === 'single' ? <><Plus className="h-4 w-4" /> 단일 동 생성</> : <><Layers className="h-4 w-4" /> 전체 동 생성</>}
            </button>
          ))}
        </div>
        {tab === 'single' && <SingleSheetCreator dongStatus={dongStatus} apiOk={!!apiOk} selDong={selDong} setSelDong={setSelDong} onCreated={loadStatus} />}
        {tab === 'all'    && <AllSheetsCreator   dongCount={dongStatus.length} apiOk={!!apiOk} onCreated={loadStatus} />}
      </div>

      <DongStatusTable dongStatus={dongStatus} statusLoad={statusLoad} loadStatus={loadStatus} onCreateDong={handleCreateDong} />

      <ShareGuide />

      <div className="bg-gray-50 border rounded-xl p-4 text-xs text-gray-500 space-y-1">
        <p className="font-semibold text-gray-700">최종 확인: Vercel 환경변수</p>
        <p>Settings → Environment Variables에 아래 3개 키가 있는지 확인하세요.</p>
        <div className="flex flex-wrap gap-2 mt-1">
          {['GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_PRIVATE_KEY', 'GOOGLE_MASTER_SHEET_ID'].map(k => (
            <code key={k} className="bg-white border rounded px-2 py-0.5 text-indigo-700">{k}</code>
          ))}
        </div>
        <p className="text-gray-400">환경변수 추가 후 반드시 Vercel에서 <strong>Redeploy</strong>를 실행하세요.</p>
      </div>
    </div>
  )
}
