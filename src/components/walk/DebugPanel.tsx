import { useEffect, useState } from 'react'
import { Bug, ChevronDown, ChevronUp, RefreshCw, FlaskConical, Footprints } from 'lucide-react'
import type { SaveStatus } from '@/app/(dashboard)/walk/useNativeStepSync'

interface DebugInfo {
  timestamp: string; today: string; memberName: string; tpBalance: number
  todayRecord: {
    date: string; steps: number; rewarded: boolean
    tpFromFund: number; tpSource: string | null; tpAwardedAt: string | null; createdAt: string
  } | null
  recentRecords: { date: string; steps: number; rewarded: boolean; tpFromFund: number }[]
  system: {
    healthFundBalance: number; healthFundOk: boolean
    annualIssued: number; annualLimit: number; annualExceeded: boolean; walkConfigExists: boolean
  }
  diagnosis: string[]
}

interface Props {
  serverSteps: number; webSessionSteps: number; isNative: boolean
  sensorMode: string; sensorActive: boolean; saveStatus: SaveStatus | null
}

export function DebugPanel({ serverSteps, webSessionSteps, isNative, sensorMode, sensorActive, saveStatus }: Props) {
  const [open,        setOpen]        = useState(false)
  const [info,        setInfo]        = useState<DebugInfo | null>(null)
  const [loading,     setLoading]     = useState(false)
  const [testResult,  setTestResult]  = useState<string | null>(null)
  const [testing,     setTesting]     = useState(false)
  const [batching,    setBatching]    = useState(false)
  const [batchResult, setBatchResult] = useState<string | null>(null)

  async function loadDebug() {
    setLoading(true)
    try { const res = await fetch('/api/walk/debug'); setInfo(await res.json()) }
    catch { setInfo(null) }
    finally { setLoading(false) }
  }

  async function runForceReward() {
    setTesting(true); setTestResult(null)
    try {
      const res = await fetch('/api/walk/test-reward', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps: 10000, force: true }),
      })
      const d = await res.json()
      setTestResult(`[강제] ${d.message ?? (d.success ? '✅ 성공' : `❌ ${d.reason}`)}`)
      await loadDebug()
    } catch (e: any) { setTestResult(`❌ 요청 실패: ${e.message}`) }
    finally { setTesting(false) }
  }

  async function runBatchAward() {
    setBatching(true); setBatchResult(null)
    try {
      const res = await fetch('/api/admin/walk/batch-award', { method: 'POST' })
      const d   = await res.json()
      if (!res.ok) { setBatchResult(`❌ ${d.error ?? '오류'}`); return }
      setBatchResult(d.total === 0 ? 'ℹ️ 미지급 건 없음' : `✅ 처리 완료: 성공 ${d.success}건 / 건너뜀 ${d.skipped}건 / 오류 ${d.failed}건 (${d.elapsed})`)
      await loadDebug()
    } catch (e: any) { setBatchResult(`❌ 요청 실패: ${e.message}`) }
    finally { setBatching(false) }
  }

  useEffect(() => { if (open && !info) loadDebug() }, [open])

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden text-xs">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-sm text-gray-500 transition-colors">
        <span className="flex items-center gap-2">
          <Bug className="h-3.5 w-3.5" />
          <span className="font-medium text-gray-600">관리자 진단 패널</span>
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-50 rounded-xl p-3 space-y-1">
              <p className="text-gray-500 font-medium">플랫폼</p>
              <p className="font-bold text-blue-600">{isNative ? '📱 APK' : '🌐 웹'}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 space-y-1">
              <p className="text-gray-500 font-medium">서버 저장 걸음</p>
              <p className="font-bold text-indigo-700">{serverSteps.toLocaleString()}보</p>
            </div>
          </div>
          {isNative && (
            <div className={`rounded-xl p-3 ${!saveStatus ? 'bg-gray-50 text-gray-400' : saveStatus.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              <p className="font-medium">
                {!saveStatus ? '⏳ 저장 대기 중...'
                  : saveStatus.ok ? `🟢 저장 성공  ${saveStatus.steps.toLocaleString()}보  ${saveStatus.at}`
                  : `🔴 저장 실패  ${saveStatus.at}`}
              </p>
              {saveStatus?.error && <p className="mt-1 break-all opacity-80">오류: {saveStatus.error}</p>}
            </div>
          )}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-gray-600">서버 진단</p>
              <button onClick={loadDebug} disabled={loading}
                className="flex items-center gap-1 text-indigo-500 hover:text-indigo-700 disabled:opacity-40">
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> 새로고침
              </button>
            </div>
            {loading && <p className="text-gray-400 text-center py-2">불러오는 중...</p>}
            {info && (
              <div className="space-y-2">
                <div className="bg-gray-50 rounded-xl p-3 space-y-0.5">
                  {info.diagnosis.map((d, i) => (
                    <p key={i} className={d.startsWith('✅') ? 'text-green-700' : d.startsWith('❌') ? 'text-red-600' : 'text-amber-600'}>{d}</p>
                  ))}
                </div>
                <div className="bg-blue-50 rounded-xl p-3 font-mono text-blue-800 space-y-0.5">
                  <p>건강기금: <strong>{info.system.healthFundBalance} TP</strong>{info.system.healthFundOk ? ' ✅' : ' ❌'}</p>
                  <p>연간 발행: {info.system.annualIssued}/{info.system.annualLimit} TP{info.system.annualExceeded ? ' ❌' : ' ✅'}</p>
                  <p>내 TP 잔액: <strong>{info.tpBalance} TP</strong></p>
                </div>
                {info.todayRecord ? (
                  <div className="bg-green-50 rounded-xl p-3 font-mono text-green-800 space-y-0.5">
                    <p>오늘 ({info.today}): <strong>{info.todayRecord.steps.toLocaleString()}보</strong>
                      {info.todayRecord.rewarded ? ` ✅ ${info.todayRecord.tpFromFund}TP 지급` : ' ⏳ 미지급'}
                    </p>
                    {info.todayRecord.tpAwardedAt && (
                      <p className="text-green-600">지급: {new Date(info.todayRecord.tpAwardedAt).toLocaleTimeString('ko-KR')}</p>
                    )}
                  </div>
                ) : (
                  <div className="bg-amber-50 rounded-xl p-3 text-amber-700">오늘 WalkRecord 없음 — 만보기 페이지를 열면 자동 생성됩니다.</div>
                )}
                {info.recentRecords.length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-3 font-mono text-gray-600 space-y-0.5">
                    {info.recentRecords.slice(0, 7).map(r => (
                      <p key={r.date}>{r.date.slice(5)} — {r.steps.toLocaleString()}보{r.rewarded ? ' ✅' : r.steps >= 10000 ? ' ⚠️ 미지급' : ''}</p>
                    ))}
                  </div>
                )}
                <p className="text-right text-gray-400">갱신: {new Date(info.timestamp).toLocaleTimeString('ko-KR')}</p>
              </div>
            )}
          </div>
          <div className="space-y-2 pt-2 border-t border-gray-100">
            {(testResult || batchResult) && (
              <div className={`rounded-xl px-3 py-2 font-medium ${(testResult ?? batchResult ?? '').includes('✅') || (testResult ?? batchResult ?? '').includes('ℹ️') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {testResult ?? batchResult}
              </div>
            )}
            <button onClick={runBatchAward} disabled={batching}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl py-2.5 font-semibold transition-colors">
              {batching ? <><RefreshCw className="h-4 w-4 animate-spin" /> 처리 중...</> : <><Footprints className="h-4 w-4" /> 미지급 TP 일괄 처리</>}
            </button>
            <p className="text-gray-400 text-center">10,000보 이상 &amp; 미지급 전체 건 즉시 지급</p>
            <button onClick={runForceReward} disabled={testing}
              className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl py-2 font-medium transition-colors">
              {testing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
              오늘 TP 강제 재지급
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
