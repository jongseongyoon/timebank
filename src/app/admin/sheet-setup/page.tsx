'use client'

import { useEffect, useState } from 'react'
import {
  Sheet, CheckCircle2, XCircle, AlertTriangle, RefreshCw,
  ExternalLink, Plus, Layers, Info, ChevronDown, ChevronUp,
  ShieldAlert, Copy, Check,
} from 'lucide-react'

// ── 타입 ──────────────────────────────────────────────────────────────────────
interface ApiStatus {
  hasServiceEmail: boolean
  hasPrivateKey:   boolean
  hasFolderId:     boolean
  hasShareEmail:   boolean
}
interface DongStatus {
  dong:      string
  sheetUrl:  string | null
  createdAt: string | null
  lastSync:  { syncedAt: string; newCount: number; totalRows: number } | null
}
interface CreateResult {
  dong:          string
  ok:            boolean
  url?:          string
  spreadsheetId?: string
  error?:        string
}

// ── 상태 아이콘 ───────────────────────────────────────────────────────────────
function StatusIcon({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 text-sm ${ok ? 'text-green-700' : 'text-red-600'}`}>
      {ok
        ? <CheckCircle2 className="h-4 w-4 shrink-0" />
        : <XCircle      className="h-4 w-4 shrink-0" />
      }
      {label}
    </div>
  )
}

// ── 설정 안내 섹션 ────────────────────────────────────────────────────────────
function SetupGuide() {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  const steps = [
    {
      no: 1, title: 'Google Cloud Console 접속',
      desc: <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer"
        className="text-blue-600 hover:underline">https://console.cloud.google.com</a>,
    },
    {
      no: 2, title: '새 프로젝트 생성',
      desc: <span>프로젝트명: <code className="bg-gray-100 px-1 rounded">timepay-gwangju</code></span>,
    },
    {
      no: 3, title: 'Google Sheets API 활성화',
      desc: <span>API 및 서비스 → 라이브러리 → Google Sheets API → <strong>사용</strong></span>,
    },
    {
      no: 4, title: 'Google Drive API 활성화',
      desc: <span>API 및 서비스 → 라이브러리 → Google Drive API → <strong>사용</strong></span>,
    },
    {
      no: 5, title: '서비스 계정 생성',
      desc: <span>API 및 서비스 → 사용자 인증 정보 → 사용자 인증 정보 만들기 → 서비스 계정<br />
        계정명: <code className="bg-gray-100 px-1 rounded">timepay-sheet-manager</code></span>,
    },
    {
      no: 6, title: 'JSON 키 다운로드',
      desc: <span>생성된 서비스 계정 클릭 → 키 → 키 추가 → JSON → 다운로드</span>,
    },
    {
      no: 7, title: 'Vercel 환경변수 추가',
      desc: (
        <div className="space-y-2 mt-1">
          {[
            { key: 'GOOGLE_SERVICE_ACCOUNT_EMAIL', val: 'JSON의 client_email 값' },
            { key: 'GOOGLE_PRIVATE_KEY',            val: 'JSON의 private_key 값 (\\n 포함)' },
            { key: 'GOOGLE_SHARE_EMAIL',            val: '관리자 Gmail 주소 — 시트 편집자 권한 자동 부여' },
            { key: 'GOOGLE_DRIVE_FOLDER_ID',        val: '드라이브 폴더 URL 끝 ID (선택)' },
          ].map(({ key, val }) => (
            <div key={key} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
              <code className="text-xs text-indigo-700 flex-1">{key}</code>
              <span className="text-xs text-gray-500">{val}</span>
              <button onClick={() => copy(key, key)}
                className="p-1 hover:bg-gray-200 rounded transition-colors">
                {copied === key ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3 text-gray-400" />}
              </button>
            </div>
          ))}
          <p className="text-xs text-gray-500 mt-1">
            환경변수 추가 후 Vercel → Settings → <strong>Redeploy</strong> 클릭
          </p>
        </div>
      ),
    },
  ]

  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 text-sm font-medium transition-colors"
      >
        <span className="flex items-center gap-2">
          <Info className="h-4 w-4 text-blue-500" />
          구글 API 1회 설정 안내
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>

      {open && (
        <div className="border-t p-5 space-y-4">
          {steps.map(s => (
            <div key={s.no} className="flex gap-4">
              <div className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                {s.no}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">{s.title}</p>
                <div className="text-sm text-gray-600 mt-0.5">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── 공유 안내 섹션 ────────────────────────────────────────────────────────────
function ShareGuide() {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 text-sm font-medium transition-colors"
      >
        <span className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-500" />
          코디네이터 공유 방법
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>
      {open && (
        <div className="border-t p-5">
          <ol className="space-y-2 text-sm text-gray-700 list-decimal list-inside">
            <li>아래 테이블에서 해당 동의 <strong>[열기]</strong> 버튼 클릭</li>
            <li>구글 시트 우측 상단 <strong>[공유]</strong> 버튼 클릭</li>
            <li>코디네이터의 구글 계정 이메일 입력</li>
            <li>권한: <strong>"편집자"</strong> 선택</li>
            <li><strong>[보내기]</strong> 클릭</li>
          </ol>
          <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-start gap-2">
            <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span><strong>"링크 있는 누구나"</strong> 공유 설정 절대 금지 — 개인정보 유출 위험</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────
export default function SheetSetupPage() {
  const [apiStatus,   setApiStatus]   = useState<ApiStatus | null>(null)
  const [dongStatus,  setDongStatus]  = useState<DongStatus[]>([])
  const [statusLoad,  setStatusLoad]  = useState(true)

  // 단일 생성
  const [tab,         setTab]         = useState<'single' | 'all'>('single')
  const [selDong,     setSelDong]     = useState('')
  const [creating,    setCreating]    = useState(false)
  const [singleResult, setSingleResult] = useState<{ url: string; dong: string } | null>(null)
  const [singleError, setSingleError] = useState<string | null>(null)

  // 전체 생성
  const [allCreating,  setAllCreating]  = useState(false)
  const [allProgress,  setAllProgress]  = useState(0)
  const [allTotal,     setAllTotal]     = useState(0)
  const [allResults,   setAllResults]   = useState<CreateResult[] | null>(null)
  const [allError,     setAllError]     = useState<string | null>(null)
  const [confirmAll,   setConfirmAll]   = useState(false)

  // ── 상태 로드 ────────────────────────────────────────────────────────────
  async function loadStatus() {
    setStatusLoad(true)
    try {
      const res  = await fetch('/api/admin/sheet-setup/status')
      const data = await res.json()
      if (res.ok) {
        setApiStatus(data.apiStatus)
        setDongStatus(data.dongStatus ?? [])
      }
    } catch {}
    setStatusLoad(false)
  }

  useEffect(() => { loadStatus() }, [])

  // ── 단일 동 생성 ──────────────────────────────────────────────────────────
  async function handleSingle() {
    if (!selDong) return
    setSingleError(null)
    setSingleResult(null)
    setCreating(true)
    try {
      const res  = await fetch('/api/admin/sheet-setup/create', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ mode: 'single', dong: selDong }),
      })
      const data = await res.json()
      if (!res.ok) { setSingleError(data.error ?? '생성 실패'); return }
      setSingleResult({ url: data.url, dong: data.dong })
      await loadStatus()  // 테이블 새로고침
    } catch (e: unknown) {
      setSingleError(e instanceof Error ? e.message : '요청 실패')
    } finally {
      setCreating(false)
    }
  }

  // ── 전체 동 일괄 생성 ────────────────────────────────────────────────────
  async function handleAll() {
    setAllError(null)
    setAllResults(null)
    setAllCreating(true)
    setAllProgress(0)
    setConfirmAll(false)

    try {
      const res  = await fetch('/api/admin/sheet-setup/create', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ mode: 'all' }),
      })
      const data = await res.json()
      if (!res.ok) { setAllError(data.error ?? '생성 실패'); return }
      setAllTotal(data.total ?? 0)
      setAllResults(data.results ?? [])
      await loadStatus()
    } catch (e: unknown) {
      setAllError(e instanceof Error ? e.message : '요청 실패')
    } finally {
      setAllCreating(false)
      setAllProgress(0)
    }
  }

  const apiOk = apiStatus?.hasServiceEmail && apiStatus?.hasPrivateKey

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* 타이틀 */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sheet className="h-6 w-6 text-green-600" />
          구글 시트 템플릿 생성
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          동별 대상자 관리 구글 시트를 자동으로 생성합니다.
        </p>
      </div>

      {/* 1. API 설정 상태 */}
      <div className="bg-white border rounded-xl p-5 space-y-3">
        <h2 className="font-semibold text-base">1. 구글 API 설정 상태</h2>
        {statusLoad
          ? <p className="text-sm text-gray-400">확인 중...</p>
          : apiStatus
            ? (
              <div className="space-y-2">
                <StatusIcon ok={apiStatus.hasServiceEmail} label="서비스 계정 이메일 (GOOGLE_SERVICE_ACCOUNT_EMAIL)" />
                <StatusIcon ok={apiStatus.hasPrivateKey}   label="서비스 계정 키 (GOOGLE_PRIVATE_KEY)" />
                <StatusIcon ok={apiStatus.hasShareEmail}   label="관리자 Gmail (GOOGLE_SHARE_EMAIL) — 시트 편집자(writer) 권한 자동 부여" />
                <StatusIcon ok={apiStatus.hasFolderId}     label="드라이브 폴더 ID (GOOGLE_DRIVE_FOLDER_ID) — 선택사항" />
                {!apiStatus.hasShareEmail && (
                  <div className="mt-1 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>
                      <strong>GOOGLE_SHARE_EMAIL 미설정:</strong> 시트는 생성되지만 서비스 계정 My Drive에만 존재합니다.
                      관리자 Gmail에서 시트를 보려면 이 값을 추가하거나, 생성 후 시트 URL을 열어 직접 공유하세요.
                    </span>
                  </div>
                )}
                {!apiOk && (
                  <div className="mt-1 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    서비스 계정 이메일 · 키가 없으면 시트를 생성할 수 없습니다.
                    아래 설정 안내를 펼쳐 확인하세요.
                  </div>
                )}
              </div>
            )
            : <p className="text-sm text-red-500">상태 조회 실패</p>
        }
      </div>

      {/* 설정 안내 (접이식) */}
      <SetupGuide />

      {/* 2. 시트 생성 */}
      <div className="bg-white border rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-base">2. 시트 생성</h2>

        {/* 탭 */}
        <div className="flex border-b">
          {(['single', 'all'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'single'
                ? <><Plus className="h-4 w-4" /> 단일 동 생성</>
                : <><Layers className="h-4 w-4" /> 전체 동 생성</>
              }
            </button>
          ))}
        </div>

        {/* ── 단일 동 ── */}
        {tab === 'single' && (
          <div className="space-y-4">
            <div className="flex gap-3 items-end">
              <div className="space-y-1.5 flex-1 max-w-xs">
                <label className="text-sm font-medium">동 선택</label>
                <select
                  value={selDong}
                  onChange={e => { setSelDong(e.target.value); setSingleResult(null); setSingleError(null) }}
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">선택...</option>
                  {dongStatus.map(d => (
                    <option key={d.dong} value={d.dong}>
                      {d.dong}{d.sheetUrl ? ' ✅' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleSingle}
                disabled={!selDong || creating || !apiOk}
                className="h-10 flex items-center gap-2 px-5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {creating
                  ? <><RefreshCw className="h-4 w-4 animate-spin" /> 생성 중...</>
                  : <><Plus className="h-4 w-4" /> 시트 생성하기</>
                }
              </button>
            </div>

            {singleError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-start gap-2">
                <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                {singleError}
              </div>
            )}

            {singleResult && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
                <p className="text-sm font-semibold text-green-800 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  {singleResult.dong} 시트 생성 완료!
                </p>
                <a
                  href={singleResult.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  구글 시트 열기
                </a>
                <p className="text-xs text-green-600">
                  코디네이터와 공유하려면 아래 "코디네이터 공유 방법" 안내를 참고하세요.
                </p>
              </div>
            )}

            {!apiOk && (
              <p className="text-xs text-amber-600">
                ⚠️ 구글 API 환경변수를 먼저 설정해야 시트를 생성할 수 있습니다.
              </p>
            )}
          </div>
        )}

        {/* ── 전체 동 ── */}
        {tab === 'all' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
              <p className="font-semibold mb-1">📋 광주 서구 19개 동 + 관외 시트 일괄 생성</p>
              <ul className="list-disc list-inside space-y-0.5 text-xs text-blue-700">
                <li>각 동마다 드롭다운·색상·헤더가 설정된 시트를 생성합니다</li>
                <li>API 쿼터 제한으로 약 <strong>2~3분</strong> 소요됩니다</li>
                <li>이미 시트가 있는 동은 URL이 덮어쓰여집니다</li>
                <li>완료 후 각 코디네이터에게 직접 공유 권한을 설정하세요</li>
              </ul>
            </div>

            {!confirmAll ? (
              <button
                onClick={() => setConfirmAll(true)}
                disabled={!apiOk}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                <Layers className="h-4 w-4" /> 전체 시트 생성하기
              </button>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  정말 전체 {dongStatus.length}개 동 시트를 생성하시겠습니까?
                </p>
                <p className="text-xs text-amber-700">기존에 생성된 시트가 있어도 새로 만들어집니다.</p>
                <div className="flex gap-2">
                  <button onClick={handleAll} disabled={allCreating}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors">
                    {allCreating
                      ? <><RefreshCw className="h-4 w-4 animate-spin" /> 생성 중...</>
                      : '확인 — 전체 생성'
                    }
                  </button>
                  <button onClick={() => setConfirmAll(false)} disabled={allCreating}
                    className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                    취소
                  </button>
                </div>
              </div>
            )}

            {/* 진행 상태 */}
            {allCreating && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                  시트 생성 중... (약 2~3분 소요)
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all animate-pulse" style={{ width: '100%' }} />
                </div>
              </div>
            )}

            {allError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-start gap-2">
                <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                {allError}
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
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="px-3 py-2 text-left">동</th>
                        <th className="px-3 py-2 text-left">결과</th>
                        <th className="px-3 py-2 text-left">링크</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allResults.map(r => (
                        <tr key={r.dong} className="border-b last:border-0">
                          <td className="px-3 py-1.5 font-medium">{r.dong}</td>
                          <td className="px-3 py-1.5">
                            {r.ok
                              ? <span className="text-green-700">✅ 완료</span>
                              : <span className="text-red-600">❌ {r.error}</span>
                            }
                          </td>
                          <td className="px-3 py-1.5">
                            {r.ok && r.url && (
                              <a href={r.url} target="_blank" rel="noreferrer"
                                className="text-blue-600 hover:underline flex items-center gap-1">
                                <ExternalLink className="h-3 w-3" /> 열기
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. 동별 시트 현황 */}
      <div className="bg-white border rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-base">3. 동별 시트 현황</h2>
          <button onClick={loadStatus} disabled={statusLoad}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-40">
            <RefreshCw className={`h-3 w-3 ${statusLoad ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        </div>

        {statusLoad
          ? <p className="text-sm text-gray-400 text-center py-4">불러오는 중...</p>
          : (
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
                        {d.sheetUrl
                          ? (
                            <a href={d.sheetUrl} target="_blank" rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors">
                              <ExternalLink className="h-3 w-3" /> 열기
                            </a>
                          )
                          : (
                            <button
                              onClick={() => { setTab('single'); setSelDong(d.dong); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg transition-colors"
                            >
                              <Plus className="h-3 w-3" /> 생성
                            </button>
                          )
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </div>

      {/* 4. 공유 안내 */}
      <ShareGuide />

      {/* 5. Vercel 환경변수 재안내 */}
      <div className="bg-gray-50 border rounded-xl p-4 text-xs text-gray-500 space-y-1">
        <p className="font-semibold text-gray-700">6단계: Vercel 환경변수 최종 확인</p>
        <p>Settings → Environment Variables에 아래 3개 키가 있는지 확인하세요.</p>
        <div className="flex flex-wrap gap-2 mt-1">
          {['GOOGLE_SERVICE_ACCOUNT_EMAIL', 'GOOGLE_PRIVATE_KEY', 'GOOGLE_DRIVE_FOLDER_ID'].map(k => (
            <code key={k} className="bg-white border rounded px-2 py-0.5 text-indigo-700">{k}</code>
          ))}
        </div>
        <p className="text-gray-400">환경변수 추가 후 반드시 Vercel에서 <strong>Redeploy</strong>를 실행하세요.</p>
      </div>
    </div>
  )
}
