'use client'

import { useState } from 'react'
import {
  ShieldAlert, FileSpreadsheet, RefreshCw, CheckCircle2,
  AlertTriangle, XCircle, SkipForward, Plus, Pencil, Trash2,
  ChevronDown, ChevronUp, Clock, User,
} from 'lucide-react'
import { DONGS } from '@/lib/constants'

// ── 타입 ──────────────────────────────────────────────────────────────────────
type ActionType = 'CREATE' | 'UPDATE' | 'DELETE' | 'SKIP' | 'ERROR'

interface PreviewRow {
  rowIndex:  number
  name:      string
  phone:     string
  dong:      string
  role:      string
  note:      string
  status:    string
  action:    ActionType
  timepayId: string
  error:     string | null
}

interface PreviewStats {
  total:  number
  create: number
  update: number
  delete: number
  skip:   number
  error:  number
}

interface ExecuteResult {
  created: number
  updated: number
  deleted: number
  skipped: number
  errors:  { row: number; name: string; reason: string }[]
}

interface SyncHistory {
  id:          string
  createdAt:   string
  dong:        string
  totalRows:   number
  newCount:    number
  updateCount: number
  deleteCount: number
  errorCount:  number
  status:      string
  syncer:      { name: string }
}

// ── 액션 뱃지 ─────────────────────────────────────────────────────────────────
const ACTION_CONFIG: Record<ActionType, { label: string; icon: React.ReactNode; cls: string }> = {
  CREATE: { label: '🆕 신규',   icon: <Plus      className="h-3 w-3" />, cls: 'bg-green-100 text-green-800' },
  UPDATE: { label: '✏️ 수정',  icon: <Pencil    className="h-3 w-3" />, cls: 'bg-blue-100 text-blue-800' },
  DELETE: { label: '🗑️ 비활성화', icon: <Trash2  className="h-3 w-3" />, cls: 'bg-red-100 text-red-800' },
  SKIP:   { label: '⏭️ 건너뜀', icon: <SkipForward className="h-3 w-3" />, cls: 'bg-gray-100 text-gray-600' },
  ERROR:  { label: '❌ 오류',   icon: <XCircle   className="h-3 w-3" />, cls: 'bg-red-100 text-red-700 font-semibold' },
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────
export default function SheetImportPage() {
  // 입력
  const [dong,     setDong]     = useState('')
  const [sheetUrl, setSheetUrl] = useState('')

  // 미리보기
  const [previewing,  setPreviewing]  = useState(false)
  const [preview,     setPreview]     = useState<PreviewRow[] | null>(null)
  const [stats,       setStats]       = useState<PreviewStats | null>(null)
  const [previewErr,  setPreviewErr]  = useState<string | null>(null)

  // 실행
  const [executing,    setExecuting]   = useState(false)
  const [execResult,   setExecResult]  = useState<ExecuteResult | null>(null)
  const [execErr,      setExecErr]     = useState<string | null>(null)

  // 이력
  const [historyOpen, setHistoryOpen] = useState(false)
  const [history,     setHistory]     = useState<SyncHistory[] | null>(null)
  const [histLoading, setHistLoading] = useState(false)

  // ── 미리보기 요청 ──────────────────────────────────────────────────────────
  async function handlePreview() {
    setPreviewErr(null)
    setPreview(null)
    setStats(null)
    setExecResult(null)

    if (!dong)        return setPreviewErr('동을 선택해주세요.')
    if (!sheetUrl.trim()) return setPreviewErr('구글 시트 URL을 입력해주세요.')

    setPreviewing(true)
    try {
      const res  = await fetch('/api/admin/sheet-import/preview', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ sheetUrl }),
      })
      const data = await res.json()
      if (!res.ok) { setPreviewErr(data.error ?? '미리보기 실패'); return }
      setPreview(data.preview)
      setStats(data.stats)
    } catch (e: unknown) {
      setPreviewErr(e instanceof Error ? e.message : '요청 실패')
    } finally {
      setPreviewing(false)
    }
  }

  // ── 실행 ──────────────────────────────────────────────────────────────────
  async function handleExecute(skipErrors: boolean) {
    setExecErr(null)
    setExecResult(null)
    setExecuting(true)
    try {
      const res  = await fetch('/api/admin/sheet-import/execute', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ sheetUrl, dong, skipErrors }),
      })
      const data = await res.json()
      if (!res.ok) { setExecErr(data.error ?? '처리 실패'); return }
      setExecResult(data.results)
      // 미리보기 초기화
      setPreview(null)
      setStats(null)
    } catch (e: unknown) {
      setExecErr(e instanceof Error ? e.message : '요청 실패')
    } finally {
      setExecuting(false)
    }
  }

  // ── 동기화 이력 로드 ───────────────────────────────────────────────────────
  async function loadHistory() {
    setHistLoading(true)
    try {
      const res  = await fetch('/api/admin/sheet-import/history')
      const data = await res.json()
      if (res.ok) setHistory(data.history ?? [])
    } catch {}
    setHistLoading(false)
  }

  function toggleHistory() {
    const next = !historyOpen
    setHistoryOpen(next)
    if (next && !history) loadHistory()
  }

  const hasErrors    = (stats?.error ?? 0) > 0
  const hasNonErrors = (stats ? stats.create + stats.update + stats.delete : 0) > 0

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileSpreadsheet className="h-6 w-6 text-green-600" />
          구글 시트 가져오기
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          코디네이터가 작성한 구글 시트를 읽어 회원을 일괄 등록·수정합니다.
        </p>
      </div>

      {/* ── 보안 주의사항 ───────────────────────────────────────────────────── */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
        <div className="flex items-center gap-2 text-amber-800 font-semibold">
          <ShieldAlert className="h-5 w-5" />
          보안 주의사항
        </div>
        <ul className="text-sm text-amber-700 space-y-1 ml-7 list-disc">
          <li>구글 시트 공유 설정을 반드시 확인하세요
            <span className="block mt-0.5 text-xs">
              ✅ 올바른 설정: <strong>특정 사람에게만 공유 (편집자)</strong>
              &nbsp;&nbsp;❌ 잘못된 설정: 링크 있는 누구나
            </span>
          </li>
          <li>가져오기 후 구글 시트의 개인정보는 <strong>최소한</strong>으로 유지하세요</li>
          <li>담당자 변경 시 즉시 구글 시트 공유 권한을 변경하세요</li>
          <li>구글 시트에는 주민번호·질병명·상세주소를 <strong>절대 입력하지 마세요</strong></li>
        </ul>
      </div>

      {/* ── 1. 연결 설정 ────────────────────────────────────────────────────── */}
      <div className="bg-white border rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-base">1. 구글 시트 연결</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* 동 선택 */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">동 선택 *</label>
            <select
              value={dong}
              onChange={e => setDong(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">선택...</option>
              {DONGS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* URL 입력 */}
          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-sm font-medium">구글 시트 URL *</label>
            <input
              type="url"
              value={sheetUrl}
              onChange={e => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {previewErr && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-start gap-2">
            <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
            {previewErr}
          </div>
        )}

        <button
          onClick={handlePreview}
          disabled={previewing}
          className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {previewing
            ? <><RefreshCw className="h-4 w-4 animate-spin" /> 읽는 중...</>
            : <><FileSpreadsheet className="h-4 w-4" /> 미리보기</>
          }
        </button>
      </div>

      {/* ── 2. 미리보기 결과 ─────────────────────────────────────────────────── */}
      {preview && stats && (
        <div className="bg-white border rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-base">2. 미리보기 결과</h2>

          {/* 통계 */}
          <div className="grid grid-cols-5 gap-3">
            {[
              { label: '신규 등록', value: stats.create, color: 'text-green-700 bg-green-50 border-green-200' },
              { label: '수정',      value: stats.update, color: 'text-blue-700 bg-blue-50 border-blue-200' },
              { label: '비활성화',  value: stats.delete, color: 'text-orange-700 bg-orange-50 border-orange-200' },
              { label: '건너뜀',    value: stats.skip,   color: 'text-gray-600 bg-gray-50 border-gray-200' },
              { label: '오류',      value: stats.error,  color: 'text-red-700 bg-red-50 border-red-200' },
            ].map(({ label, value, color }) => (
              <div key={label} className={`rounded-xl border p-3 text-center ${color}`}>
                <p className="text-2xl font-bold tabular-nums">{value}</p>
                <p className="text-xs mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* 상세 목록 */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-3 py-2 text-left font-medium text-gray-600 w-12">행</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">이름</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">전화번호</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">동</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">구분</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">처리</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">오류 내용</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row, idx) => {
                  const cfg = ACTION_CONFIG[row.action]
                  const isErr = row.action === 'ERROR'
                  return (
                    <tr
                      key={idx}
                      className={`border-b last:border-0 ${isErr ? 'bg-red-50' : 'hover:bg-gray-50'}`}
                    >
                      <td className="px-3 py-2 text-gray-500">{row.rowIndex}</td>
                      <td className="px-3 py-2 font-medium">
                        {row.name
                          ? `${row.name.slice(0, 1)}${'○'.repeat(Math.max(0, row.name.length - 1))}`
                          : '-'
                        }
                      </td>
                      <td className="px-3 py-2 tabular-nums text-gray-600">
                        {row.phone
                          ? row.phone.replace(/(\d{3})-(\d{4})-(\d{4})/, '$1-****-$3')
                          : '-'
                        }
                      </td>
                      <td className="px-3 py-2">{row.dong || '-'}</td>
                      <td className="px-3 py-2">{row.role || '-'}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-red-600 text-xs">
                        {row.error ?? ''}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* 실행 버튼 */}
          {execErr && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-start gap-2">
              <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
              {execErr}
            </div>
          )}

          <div className="flex gap-3 flex-wrap">
            {hasErrors && hasNonErrors && (
              <button
                onClick={() => handleExecute(true)}
                disabled={executing}
                className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {executing
                  ? <><RefreshCw className="h-4 w-4 animate-spin" /> 처리 중...</>
                  : <><AlertTriangle className="h-4 w-4" /> 오류 제외하고 적용 ({stats.create + stats.update + stats.delete}건)</>
                }
              </button>
            )}

            <button
              onClick={() => handleExecute(false)}
              disabled={executing || (hasErrors && !hasNonErrors) || !hasNonErrors}
              title={hasErrors ? '오류 행이 있으면 전체 적용 불가' : undefined}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors text-white
                ${!hasErrors && hasNonErrors
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-gray-300 cursor-not-allowed'
                } disabled:opacity-50`}
            >
              {executing
                ? <><RefreshCw className="h-4 w-4 animate-spin" /> 처리 중...</>
                : <><CheckCircle2 className="h-4 w-4" /> 전체 적용 ({stats.create + stats.update + stats.delete}건)</>
              }
            </button>
          </div>

          {hasErrors && (
            <p className="text-xs text-red-600">
              ⚠️ 오류 {stats.error}건이 있습니다.
              "오류 제외하고 적용" 버튼으로 정상 행만 처리하거나,
              구글 시트를 수정 후 미리보기를 다시 실행하세요.
            </p>
          )}
        </div>
      )}

      {/* ── 3. 처리 결과 ─────────────────────────────────────────────────────── */}
      {execResult && (
        <div className="bg-white border rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-base flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            처리 완료
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-green-700 tabular-nums">{execResult.created}</p>
              <p className="text-xs text-green-600 mt-0.5">✅ 신규 등록</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-blue-700 tabular-nums">{execResult.updated}</p>
              <p className="text-xs text-blue-600 mt-0.5">✅ 수정 완료</p>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-orange-700 tabular-nums">{execResult.deleted}</p>
              <p className="text-xs text-orange-600 mt-0.5">✅ 비활성화</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-red-700 tabular-nums">{execResult.errors.length}</p>
              <p className="text-xs text-red-600 mt-0.5">⚠️ 오류</p>
            </div>
          </div>

          {execResult.created > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
              <p className="font-semibold mb-1">📱 임시 비밀번호 안내</p>
              <p>신규 등록된 {execResult.created}명의 임시 비밀번호는 <strong>생년월일 뒤 6자리</strong>입니다.</p>
              <p className="text-xs text-blue-600 mt-1">예: 1945년 3월 15일생 → <code className="bg-blue-100 px-1 rounded">450315</code></p>
              <p className="text-xs text-blue-600 mt-0.5">첫 로그인 후 반드시 비밀번호를 변경하도록 안내해주세요.</p>
            </div>
          )}

          {execResult.errors.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-red-700">오류 목록</p>
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-1 max-h-40 overflow-y-auto">
                {execResult.errors.map((e, i) => (
                  <p key={i} className="text-xs text-red-700">
                    행 {e.row} ({e.name}): {e.reason}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 4. 동기화 이력 ───────────────────────────────────────────────────── */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <button
          onClick={toggleHistory}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors text-sm font-medium"
        >
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" />
            최근 동기화 이력
          </span>
          {historyOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </button>

        {historyOpen && (
          <div className="border-t">
            {histLoading
              ? <p className="p-4 text-sm text-gray-400 text-center">불러오는 중...</p>
              : !history || history.length === 0
                ? <p className="p-4 text-sm text-gray-400 text-center">이력이 없습니다.</p>
                : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          <th className="px-3 py-2 text-left font-medium text-gray-600">날짜</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">동</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">담당자</th>
                          <th className="px-3 py-2 text-center font-medium text-gray-600">전체</th>
                          <th className="px-3 py-2 text-center font-medium text-gray-600">신규</th>
                          <th className="px-3 py-2 text-center font-medium text-gray-600">수정</th>
                          <th className="px-3 py-2 text-center font-medium text-gray-600">삭제</th>
                          <th className="px-3 py-2 text-center font-medium text-gray-600">오류</th>
                          <th className="px-3 py-2 text-center font-medium text-gray-600">상태</th>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map(h => (
                          <tr key={h.id} className="border-b last:border-0 hover:bg-gray-50">
                            <td className="px-3 py-2 text-gray-500 tabular-nums whitespace-nowrap">
                              {new Date(h.createdAt).toLocaleString('ko-KR', {
                                month: '2-digit', day: '2-digit',
                                hour: '2-digit',  minute: '2-digit',
                              })}
                            </td>
                            <td className="px-3 py-2">{h.dong}</td>
                            <td className="px-3 py-2 flex items-center gap-1">
                              <User className="h-3 w-3 text-gray-400" />
                              {h.syncer?.name ?? '-'}
                            </td>
                            <td className="px-3 py-2 text-center tabular-nums">{h.totalRows}</td>
                            <td className="px-3 py-2 text-center tabular-nums text-green-700">{h.newCount}</td>
                            <td className="px-3 py-2 text-center tabular-nums text-blue-700">{h.updateCount}</td>
                            <td className="px-3 py-2 text-center tabular-nums text-orange-700">{h.deleteCount}</td>
                            <td className="px-3 py-2 text-center tabular-nums text-red-700">{h.errorCount}</td>
                            <td className="px-3 py-2 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                h.status === 'SUCCESS' ? 'bg-green-100 text-green-700' :
                                h.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {h.status === 'SUCCESS' ? '성공' :
                                 h.status === 'PARTIAL' ? '부분성공' : '실패'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
            }
          </div>
        )}
      </div>
    </div>
  )
}
