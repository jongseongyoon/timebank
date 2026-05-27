'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Footprints, Trophy, CircleOff, Activity, Cpu, Heart, Bug, ChevronDown, ChevronUp, RefreshCw, FlaskConical, Clock } from 'lucide-react'

const GOAL = 10000
const REWARD_TP = 0.5

// ── 재원 현황 카드 (단순화 버전: 건강증진 기금만 표시) ────────────────────────
interface FundStatus {
  healthFund:      { tpBalance: number; totalDistributed: number } | null
  circulationPool: { tpBalance: number; totalCirculated: number } | null
  walkConfig:      { annualTpLimit: number; distributedThisYear: number; tpPerGoal: number } | null
}

function FundStatusCard({ status }: { status: FundStatus | null }) {
  if (!status?.healthFund) return null
  const { healthFund, walkConfig } = status

  const fundBal   = healthFund.tpBalance
  const yearDist  = walkConfig?.distributedThisYear ?? 0
  const yearLimit = walkConfig?.annualTpLimit ?? 0
  const yearPct   = yearLimit > 0 ? Math.min(yearDist / yearLimit * 100, 100) : 0

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <div className="bg-green-100 rounded-full p-2">
          <Heart className="h-4 w-4 text-green-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-green-800">오늘의 만보기 재원</p>
          <p className="text-xs text-green-600">건강증진 기금</p>
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-3xl font-bold text-green-800 tabular-nums">
            {fundBal.toLocaleString()} TP
          </p>
          <p className="text-xs text-green-600 mt-0.5">1만보 달성 시 <strong>0.5 TP</strong> 지급</p>
        </div>
        <div className="text-right text-xs text-green-500">
          <p>지자체·기업 출연 기금</p>
          <p>만보기 보상 전담</p>
        </div>
      </div>

      {/* 연간 발행 진행률 */}
      {walkConfig && (
        <div className="space-y-1 pt-1 border-t border-green-200">
          <div className="flex justify-between text-xs text-green-600">
            <span>올해 발행량</span>
            <span className="tabular-nums">{yearDist.toLocaleString()} / {yearLimit.toLocaleString()} TP</span>
          </div>
          <div className="h-2 bg-green-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${yearPct}%` }}
            />
          </div>
          <p className="text-xs text-green-400 text-right">{yearPct.toFixed(1)}% 사용</p>
        </div>
      )}
    </div>
  )
}

// ── 디버그 패널 ──────────────────────────────────────────────────────────────
interface DebugInfo {
  timestamp:   string
  today:       string
  memberName:  string
  tpBalance:   number
  todayRecord: {
    date: string; steps: number; rewarded: boolean
    tpFromFund: number; tpSource: string | null; tpAwardedAt: string | null
    createdAt: string
  } | null
  recentRecords: { date: string; steps: number; rewarded: boolean; tpFromFund: number }[]
  system: {
    healthFundBalance: number; healthFundOk: boolean
    annualIssued: number; annualLimit: number; annualExceeded: boolean
    walkConfigExists: boolean
  }
  diagnosis: string[]
}

function DebugPanel({
  serverSteps, webSessionSteps, isNative, sensorMode, sensorActive, saveStatus,
}: {
  serverSteps: number; webSessionSteps: number; isNative: boolean
  sensorMode: string; sensorActive: boolean
  saveStatus: SaveStatus | null
}) {
  const [open,       setOpen]       = useState(false)
  const [info,       setInfo]       = useState<DebugInfo | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [testing,    setTesting]    = useState(false)
  const [batching,   setBatching]   = useState(false)
  const [batchResult, setBatchResult] = useState<string | null>(null)

  async function loadDebug() {
    setLoading(true)
    try {
      const res = await fetch('/api/walk/debug')
      const d   = await res.json()
      setInfo(d)
    } catch (e: any) {
      setInfo(null)
    } finally {
      setLoading(false)
    }
  }

  async function runTestReward() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/walk/test-reward', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ steps: 10000 }),
      })
      const d = await res.json()
      setTestResult(d.message ?? (d.success ? '✅ 성공' : `❌ ${d.reason}`))
      // 결과 후 디버그 정보 새로고침
      await loadDebug()
    } catch (e: any) {
      setTestResult(`❌ 요청 실패: ${e.message}`)
    } finally {
      setTesting(false)
    }
  }

  async function runForceReward() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/walk/test-reward', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ steps: 10000, force: true }),
      })
      const d = await res.json()
      setTestResult(`[강제] ${d.message ?? (d.success ? '✅ 성공' : `❌ ${d.reason}`)}`)
      await loadDebug()
    } catch (e: any) {
      setTestResult(`❌ 요청 실패: ${e.message}`)
    } finally {
      setTesting(false)
    }
  }

  async function runBatchAward() {
    setBatching(true)
    setBatchResult(null)
    try {
      const res = await fetch('/api/admin/walk/batch-award', { method: 'POST' })
      const d   = await res.json()
      if (!res.ok) {
        setBatchResult(`❌ ${d.error ?? '오류'}`)
        return
      }
      if (d.total === 0) {
        setBatchResult('ℹ️ 미지급 건 없음')
      } else {
        setBatchResult(
          `✅ 처리 완료: 성공 ${d.success}건 / 건너뜀 ${d.skipped}건 / 오류 ${d.failed}건 (${d.elapsed})`
        )
      }
      await loadDebug()
    } catch (e: any) {
      setBatchResult(`❌ 요청 실패: ${e.message}`)
    } finally {
      setBatching(false)
    }
  }

  useEffect(() => {
    if (open && !info) loadDebug()
  }, [open])

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden text-xs">
      {/* 헤더 토글 */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-sm text-gray-500 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Bug className="h-3.5 w-3.5" />
          <span className="font-medium text-gray-600">관리자 진단 패널</span>
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
        <div className="p-4 space-y-3">

          {/* ── 상태 요약 ──────────────────────────────────── */}
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

          {/* ── APK 저장 상태 ────────────────────────────── */}
          {isNative && (
            <div className={`rounded-xl p-3 ${
              !saveStatus       ? 'bg-gray-50 text-gray-400' :
              saveStatus.ok     ? 'bg-green-50 text-green-800' :
                                  'bg-red-50 text-red-800'
            }`}>
              <p className="font-medium">
                {!saveStatus
                  ? '⏳ 저장 대기 중...'
                  : saveStatus.ok
                    ? `🟢 저장 성공  ${saveStatus.steps.toLocaleString()}보  ${saveStatus.at}`
                    : `🔴 저장 실패  ${saveStatus.at}`
                }
              </p>
              {saveStatus?.error && (
                <p className="mt-1 break-all opacity-80">오류: {saveStatus.error}</p>
              )}
            </div>
          )}

          {/* ── 서버 진단 ────────────────────────────────── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-gray-600">서버 진단</p>
              <button onClick={loadDebug} disabled={loading}
                className="flex items-center gap-1 text-indigo-500 hover:text-indigo-700 disabled:opacity-40">
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                새로고침
              </button>
            </div>

            {loading && <p className="text-gray-400 text-center py-2">불러오는 중...</p>}

            {info && (
              <div className="space-y-2">
                {/* 진단 메시지 */}
                <div className="bg-gray-50 rounded-xl p-3 space-y-0.5">
                  {info.diagnosis.map((d, i) => (
                    <p key={i} className={
                      d.startsWith('✅') ? 'text-green-700' :
                      d.startsWith('❌') ? 'text-red-600' : 'text-amber-600'
                    }>{d}</p>
                  ))}
                </div>

                {/* 시스템 수치 */}
                <div className="bg-blue-50 rounded-xl p-3 font-mono text-blue-800 space-y-0.5">
                  <p>건강기금: <strong>{info.system.healthFundBalance} TP</strong>{info.system.healthFundOk ? ' ✅' : ' ❌'}</p>
                  <p>연간 발행: {info.system.annualIssued}/{info.system.annualLimit} TP{info.system.annualExceeded ? ' ❌' : ' ✅'}</p>
                  <p>내 TP 잔액: <strong>{info.tpBalance} TP</strong></p>
                </div>

                {/* 오늘 기록 */}
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
                  <div className="bg-amber-50 rounded-xl p-3 text-amber-700">
                    오늘 WalkRecord 없음 — 만보기 페이지를 열면 자동 생성됩니다.
                  </div>
                )}

                {/* 최근 기록 (간략) */}
                {info.recentRecords.length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-3 font-mono text-gray-600 space-y-0.5">
                    {info.recentRecords.slice(0, 7).map(r => (
                      <p key={r.date}>
                        {r.date.slice(5)} — {r.steps.toLocaleString()}보
                        {r.rewarded ? ` ✅` : r.steps >= 10000 ? ' ⚠️ 미지급' : ''}
                      </p>
                    ))}
                  </div>
                )}

                <p className="text-right text-gray-400">갱신: {new Date(info.timestamp).toLocaleTimeString('ko-KR')}</p>
              </div>
            )}
          </div>

          {/* ── 액션 버튼 ────────────────────────────────── */}
          <div className="space-y-2 pt-2 border-t border-gray-100">
            {(testResult || batchResult) && (
              <div className={`rounded-xl px-3 py-2 font-medium ${
                (testResult ?? batchResult ?? '').includes('✅') || (testResult ?? batchResult ?? '').includes('ℹ️')
                  ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {testResult ?? batchResult}
              </div>
            )}

            {/* 미지급 일괄 처리 */}
            <button onClick={runBatchAward} disabled={batching}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl py-2.5 font-semibold transition-colors">
              {batching
                ? <><RefreshCw className="h-4 w-4 animate-spin" /> 처리 중...</>
                : <><Footprints className="h-4 w-4" /> 미지급 TP 일괄 처리</>
              }
            </button>
            <p className="text-gray-400 text-center">10,000보 이상 & 미지급 전체 건 즉시 지급</p>

            {/* 강제 재지급 */}
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

const COOLDOWN_MS = 280
const STEP_DELTA_PURE = 1.2
const STEP_DELTA_GRAVITY = 2.0
const EMA_ALPHA = 0.005

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform: () => boolean
      Plugins: { StepCounter?: any }
    }
  }
}

function isCapacitorNative(): boolean {
  return typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.()
}

function getStepPlugin(): any | null {
  return window.Capacitor?.Plugins?.StepCounter ?? null
}

function isTrackingHour(): boolean {
  const now = new Date()
  const h = now.getHours()
  const m = now.getMinutes()
  const afterStart = h > 0 || (h === 0 && m >= 1)
  const beforeStop = h < 23 || (h === 23 && m < 59)
  return afterStart && beforeStop
}

// ═══════════════════════════════════════════════════════
// APK 전용: 네이티브 서비스 걸음 수 폴링 + 서버 동기화
// ═══════════════════════════════════════════════════════
type SyncedInfo = { steps: number; rewarded: boolean; rewardedNow: boolean; tpFromFund?: number; tpFromCirc?: number }
export type SaveStatus = { steps: number; ok: boolean; at: string; error?: string }

function useNativeStepSync(
  serverSteps: number,
  serverRewarded: boolean,           // DB의 실제 rewarded 상태 (steps 수로 대체 불가)
  onSynced:     (info: SyncedInfo) => void,
  onSaveStatus: (s: SaveStatus) => void,
) {
  const [nativeSteps, setNativeSteps] = useState(serverSteps)
  const [inWindow, setInWindow] = useState(isTrackingHour())
  const serverStepsRef    = useRef(serverSteps)
  const serverRewardedRef = useRef(serverRewarded)
  const lastSavedRef      = useRef(-1)   // 서버에 마지막으로 저장한 걸음수
  const pollCountRef      = useRef(0)    // 폴링 횟수 카운터

  useEffect(() => { serverStepsRef.current = serverSteps }, [serverSteps])
  useEffect(() => { serverRewardedRef.current = serverRewarded }, [serverRewarded])

  useEffect(() => {
    if (!isCapacitorNative()) return
    const plugin = getStepPlugin()
    if (!plugin) return

    // ── 저장 결과 보고 헬퍼 ───────────────────────────────────────────────
    function reportSave(steps: number, ok: boolean, error?: string) {
      onSaveStatus({
        steps,
        ok,
        at: new Date().toLocaleTimeString('ko-KR'),
        error,
      })
    }

    // ── pending_save 서버 동기화 (앱 열릴 때 1회) ─────────────────────────
    async function syncPending() {
      try {
        const { pending, steps, date } = await plugin.getPendingSave()
        if (!pending || steps <= 0) return
        const today = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10)
        const diffDays = Math.floor((new Date(today).getTime() - new Date(date).getTime()) / 86400000)
        if (diffDays < 0 || diffDays > 1) return
        const res = await fetch('/api/walk/steps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ steps, date }),
        })
        const d = await res.json()
        if (res.ok) {
          lastSavedRef.current = d.steps
          reportSave(d.steps, true)
          onSynced({ steps: d.steps, rewarded: d.rewarded, rewardedNow: !!d.rewardedNow, tpFromFund: d.tpFromFund, tpFromCirc: d.tpFromCirculation })
          await plugin.markSaved()
        } else {
          reportSave(steps, false, `pending sync ${res.status}: ${d.error ?? ''}`)
        }
      } catch (e: any) {
        reportSave(0, false, `pending sync 예외: ${e.message ?? e}`)
      }
    }
    syncPending()

    // ── 걸음수 저장 전용 (TP 지급 없음) ─────────────────────────────────
    async function saveStepsOnly(steps: number) {
      try {
        const res = await fetch('/api/walk/record', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ steps }),
        })
        const d = await res.json()
        if (res.ok) {
          lastSavedRef.current = d.steps ?? steps
          reportSave(d.steps ?? steps, true)
        } else {
          reportSave(steps, false, `record ${res.status}: ${d.error ?? ''}`)
        }
      } catch (e: any) {
        reportSave(steps, false, `record 예외: ${e.message ?? e}`)
      }
    }

    // ── 걸음수 저장 + TP 지급 ────────────────────────────────────────────
    async function saveStepsAndAward(steps: number) {
      try {
        const res = await fetch('/api/walk/steps', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ steps }),
        })
        const d = await res.json()
        if (res.ok) {
          lastSavedRef.current = d.steps ?? steps
          reportSave(d.steps ?? steps, true)
          onSynced({
            steps:       d.steps ?? steps,
            rewarded:    d.rewarded,
            rewardedNow: !!d.rewardedNow,
            tpFromFund:  d.tpFromFund,
            tpFromCirc:  d.tpFromCirculation,
          })
        } else {
          reportSave(steps, false, `steps ${res.status}: ${d.error ?? ''}`)
        }
      } catch (e: any) {
        reportSave(steps, false, `steps 예외: ${e.message ?? e}`)
      }
    }

    // ── 걸음수 폴링 (5초) + 저장 판단 ───────────────────────────────────
    async function poll() {
      try {
        const { steps: rawSteps } = await plugin.getTodaySteps()
        const nSteps = typeof rawSteps === 'number' ? rawSteps : 0
        setNativeSteps(nSteps)

        if (nSteps > 0) {
          pollCountRef.current += 1
          const prevSaved       = lastSavedRef.current
          const alreadyRewarded = serverRewardedRef.current
          const justCrossedGoal = nSteps >= 10000 && prevSaved >= 0 && prevSaved < 10000
          const openedAfterGoal = nSteps >= 10000 && prevSaved < 0

          if (!alreadyRewarded && (justCrossedGoal || openedAfterGoal)) {
            // 목표 돌파 / 앱 열었을 때 이미 1만보 이상 + 미지급 → 저장 + TP 즉시 지급
            await saveStepsAndAward(nSteps)
          } else {
            // 일반 저장:
            //   ① 첫 폴링 (prevSaved < 0)
            //   ② 5분마다 (60 polls × 5s)
            //   ③ 500보 이상 변화 (걷는 중 실시간 반영)
            const bigChange   = prevSaved >= 0 && nSteps - prevSaved >= 500
            const periodicSave = pollCountRef.current % 60 === 0  // 5분마다
            const shouldSave  = prevSaved < 0 || bigChange || periodicSave
            if (shouldSave) await saveStepsOnly(nSteps)
          }
        }
      } catch (e: any) {
        reportSave(0, false, `getTodaySteps 예외: ${(e as any).message ?? e}`)
      }
      setInWindow(isTrackingHour())
    }
    poll()
    const timer = setInterval(poll, 5000)
    return () => clearInterval(timer)
  }, [])

  const displaySteps = Math.max(serverSteps, nativeSteps)
  return { displaySteps, inWindow }
}

// ═══════════════════════════════════════════════════════
// 웹 전용: Generic Sensor → DeviceMotion 자동 측정
// ═══════════════════════════════════════════════════════
function useWebSensorTracking(enabled: boolean, onStep: () => void) {
  const [sensorMode, setSensorMode] = useState<'none' | 'generic' | 'devicemotion'>('none')
  const [sensorActive, setSensorActive] = useState(false)
  const [debugMag, setDebugMag] = useState(0)
  const [eventCount, setEventCount] = useState(0)
  const [tracking, setTracking] = useState(false)
  const [permError, setPermError] = useState('')

  const lastMagRef = useRef(0)
  const risingRef = useRef(false)
  const lastStepTimeRef = useRef(0)
  const motionHandlerRef = useRef<((e: DeviceMotionEvent) => void) | null>(null)
  const sensorRef = useRef<any>(null)
  const eventCountRef = useRef(0)
  const baselineRef = useRef(9.81)
  const baselineInitRef = useRef(false)
  const trackingRef = useRef(false)

  function processMag(mag: number, stepDelta: number) {
    eventCountRef.current += 1
    if (eventCountRef.current % 10 === 0) {
      setSensorActive(true)
      setDebugMag(Math.round(mag * 10) / 10)
      setEventCount(eventCountRef.current)
    }
    if (!baselineInitRef.current) {
      baselineRef.current = mag
      baselineInitRef.current = true
    }
    baselineRef.current = EMA_ALPHA * mag + (1 - EMA_ALPHA) * baselineRef.current
    if (mag > lastMagRef.current) {
      risingRef.current = true
    } else if (risingRef.current) {
      if (lastMagRef.current > baselineRef.current + stepDelta) {
        const now = Date.now()
        if (now - lastStepTimeRef.current > COOLDOWN_MS) {
          onStep()
          lastStepTimeRef.current = now
        }
      }
      risingRef.current = false
    }
    lastMagRef.current = mag
  }

  async function tryGenericSensor(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Accelerometer' in window)) return false
    try {
      const perm = await navigator.permissions.query({ name: 'accelerometer' as PermissionName })
      if (perm.state === 'denied') return false
      const sensor = new (window as any).Accelerometer({ frequency: 60 })
      sensor.addEventListener('error', () => {
        sensor.stop()
        sensorRef.current = null
        tryDeviceMotion()
      })
      sensor.addEventListener('reading', () => {
        const x: number = sensor.x ?? 0
        const y: number = sensor.y ?? 0
        const z: number = sensor.z ?? 0
        processMag(Math.sqrt(x * x + y * y + z * z), STEP_DELTA_PURE)
      })
      sensor.start()
      sensorRef.current = sensor
      setSensorMode('generic')
      return true
    } catch {
      return false
    }
  }

  function tryDeviceMotion() {
    function handler(e: DeviceMotionEvent) {
      const purAcc = e.acceleration
      const purValid = purAcc !== null && purAcc !== undefined && purAcc.x !== null && purAcc.y !== null && purAcc.z !== null
      const gravAcc = e.accelerationIncludingGravity
      const gravValid = gravAcc !== null && gravAcc !== undefined && gravAcc.x !== null && gravAcc.y !== null && gravAcc.z !== null
      if (!purValid && !gravValid) return
      let mag: number, stepDelta: number
      if (purValid) {
        const ax = purAcc!.x!, ay = purAcc!.y!, az = purAcc!.z ?? 0
        mag = Math.sqrt(ax * ax + ay * ay + az * az)
        stepDelta = STEP_DELTA_PURE
      } else {
        const ax = gravAcc!.x!, ay = gravAcc!.y!, az = gravAcc!.z!
        mag = Math.sqrt(ax * ax + ay * ay + az * az)
        stepDelta = STEP_DELTA_GRAVITY
      }
      processMag(mag, stepDelta)
    }
    motionHandlerRef.current = handler
    window.addEventListener('devicemotion', handler)
    setSensorMode('devicemotion')
  }

  function stopSensors() {
    if (sensorRef.current) { try { sensorRef.current.stop() } catch {} sensorRef.current = null }
    if (motionHandlerRef.current) { window.removeEventListener('devicemotion', motionHandlerRef.current); motionHandlerRef.current = null }
    setSensorMode('none')
    setSensorActive(false)
    trackingRef.current = false
    setTracking(false)
  }

  const startSensors = useCallback(async () => {
    if (trackingRef.current) return
    if (typeof DeviceMotionEvent !== 'undefined' && typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const result = await (DeviceMotionEvent as any).requestPermission()
        if (result !== 'granted') { setPermError('동작 센서 권한이 필요합니다. iOS 설정 > Safari > 모션 및 방향을 허용해 주세요.'); return }
      } catch { setPermError('센서 권한 요청에 실패했습니다.'); return }
    }
    setPermError('')
    setSensorActive(false)
    setSensorMode('none')
    setEventCount(0)
    eventCountRef.current = 0
    baselineInitRef.current = false
    baselineRef.current = 9.81
    lastMagRef.current = 0
    risingRef.current = false
    trackingRef.current = true
    setTracking(true)

    const genericOk = await tryGenericSensor()
    if (!genericOk) tryDeviceMotion()
  }, [])

  useEffect(() => {
    if (!enabled) return
    function checkTime() {
      if (isTrackingHour()) {
        if (!trackingRef.current) startSensors()
      } else {
        if (trackingRef.current) stopSensors()
      }
    }
    checkTime()
    const timer = setInterval(checkTime, 30_000)
    return () => {
      clearInterval(timer)
      stopSensors()
    }
  }, [enabled, startSensors])

  return { tracking, sensorMode, sensorActive, debugMag, eventCount, permError }
}

// ═══════════════════════════════════════════════════════
// 메인 페이지
// ═══════════════════════════════════════════════════════
export default function WalkPage() {
  const [loading, setLoading] = useState(true)
  const [serverSteps, setServerSteps] = useState(0)
  const [rewarded, setRewarded] = useState(false)
  const [justRewarded, setJustRewarded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [webSessionSteps, setWebSessionSteps] = useState(0)
  const webSessionRef = useRef(0)
  const serverStepsRef = useRef(0)
  const [rewardSource, setRewardSource] = useState<{ fromFund: number; fromCirc: number } | null>(null)
  const [fundStatus, setFundStatus] = useState<FundStatus | null>(null)
  const [checking,   setChecking]   = useState(false)
  const [checkMsg,   setCheckMsg]   = useState<{ ok: boolean; text: string } | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus | null>(null)
  const [isAdmin,    setIsAdmin]    = useState(false)

  const isNative = isCapacitorNative()

  useEffect(() => {
    Promise.all([
      fetch('/api/walk/today').then(r => r.json()),
      fetch('/api/walk/fund-status').then(r => r.json()).catch(() => null),
    ]).then(([d, fs]) => {
      const s = d.steps ?? 0
      setServerSteps(s)
      serverStepsRef.current = s
      setRewarded(d.rewarded ?? false)
      setIsAdmin(!!d.isAdmin)
      if (d.rewarded && d.tpFromFund != null) {
        setRewardSource({ fromFund: d.tpFromFund, fromCirc: d.tpFromCirculation ?? 0 })
      }
      if (fs && !fs.error) setFundStatus(fs)
      setLoading(false)

      // 오늘 기록이 10,000보 이상이고 미지급이면 자동으로 TP 지급 시도
      // (앱을 열었을 때 서버 기록이 이미 있는 경우 처리)
      if (s >= 10000 && !d.rewarded) {
        fetch('/api/walk/steps', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ steps: s }),
        }).then(r => r.json()).then(result => {
          if (result.rewardedNow) {
            setRewarded(true)
            setJustRewarded(true)
            if (result.tpFromFund != null) {
              setRewardSource({ fromFund: result.tpFromFund, fromCirc: result.tpFromCirculation ?? 0 })
            }
          }
        }).catch(() => {})
      }
    }).catch(() => setLoading(false))
  }, [])

  const { displaySteps: nativeDisplaySteps, inWindow } = useNativeStepSync(
    serverSteps,
    rewarded,
    ({ steps, rewarded: rew, rewardedNow: rewNow, tpFromFund, tpFromCirc }) => {
      setServerSteps(steps)
      serverStepsRef.current = steps
      setRewarded(rew)
      if (rewNow) {
        setJustRewarded(true)
        if (tpFromFund != null) setRewardSource({ fromFund: tpFromFund, fromCirc: tpFromCirc ?? 0 })
      }
    },
    setSaveStatus,   // 저장 상태 콜백 — 디버그 패널에 표시
  )

  const onWebStep = useCallback(() => {
    webSessionRef.current += 1
    setWebSessionSteps(webSessionRef.current)
  }, [])

  const { tracking: webTracking, sensorMode, sensorActive, debugMag, eventCount, permError } =
    useWebSensorTracking(!isNative && !loading, onWebStep)

  const prevWebTracking = useRef(webTracking)
  useEffect(() => {
    if (prevWebTracking.current && !webTracking) {
      const total = serverStepsRef.current + webSessionRef.current
      if (total > serverStepsRef.current && webSessionRef.current > 0) {
        setSaving(true)
        fetch('/api/walk/steps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ steps: total }),
        })
          .then(r => r.json())
          .then(d => {
            if (d.steps) {
              setServerSteps(d.steps)
              serverStepsRef.current = d.steps
              setRewarded(d.rewarded)
              if (d.rewardedNow) {
                setJustRewarded(true)
                if (d.tpFromFund != null) setRewardSource({ fromFund: d.tpFromFund, fromCirc: d.tpFromCirculation ?? 0 })
              }
              webSessionRef.current = 0
              setWebSessionSteps(0)
            }
          })
          .finally(() => setSaving(false))
      }
    }
    prevWebTracking.current = webTracking
  }, [webTracking])

  // 자정 타이머 제거 — Vercel Cron Job (매일 23:59)이 서버에서 일괄 처리
  // 화면 리셋은 다음날 페이지를 다시 열 때 /api/walk/today 재조회로 자동 반영됨

  const totalSteps = isNative ? nativeDisplaySteps : serverSteps + webSessionSteps
  const progress = Math.min(totalSteps / GOAL, 1)
  const circumference = 2 * Math.PI * 90
  const pct = Math.round(progress * 100)
  const isActive = isNative ? inWindow : webTracking

  const SENSOR_LABEL: Record<string, string> = {
    generic: '🔬 Generic Sensor',
    devicemotion: '📡 DeviceMotion',
    none: '',
  }

  // 지금 바로 걸음수 확인 & TP 지급
  // APK: 최신 걸음수를 네이티브에서 직접 읽어 저장 → TP 지급 시도
  async function handleCheckNow() {
    setChecking(true)
    setCheckMsg(null)
    try {
      // ① APK: 네이티브에서 최신 걸음수 읽기
      let stepsToSave = totalSteps
      if (isNative) {
        const plugin = getStepPlugin()
        if (plugin) {
          try {
            const { steps: freshSteps } = await plugin.getTodaySteps()
            if (typeof freshSteps === 'number' && freshSteps > 0) {
              stepsToSave = Math.max(totalSteps, freshSteps)
            }
          } catch {}
        }
      }

      // ② 걸음수 저장 + TP 지급 시도 (POST /api/walk/steps)
      const res = await fetch('/api/walk/steps', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ steps: stepsToSave }),
      })
      const d = await res.json()

      // 화면 상태 업데이트
      const saved = d.steps ?? stepsToSave
      setServerSteps(saved)
      serverStepsRef.current = saved

      if (d.rewardedNow) {
        setRewarded(true)
        setJustRewarded(true)
        if (d.tpFromFund != null) setRewardSource({ fromFund: d.tpFromFund, fromCirc: d.tpFromCirculation ?? 0 })
        setCheckMsg({ ok: true, text: `✅ ${d.tpTotal ?? REWARD_TP} TP 지급 완료! (${saved.toLocaleString()}보)` })
      } else if (d.rewarded) {
        setRewarded(true)
        setCheckMsg({ ok: true, text: '✅ 이미 오늘 TP가 지급되었습니다.' })
      } else if (d.fundReason) {
        setCheckMsg({ ok: false, text: `❌ ${d.fundReason}` })
      } else if (saved < 10000) {
        setCheckMsg({ ok: false, text: `⚠️ ${saved.toLocaleString()}보 저장됨 — ${(10000 - saved).toLocaleString()}보 더 걸으면 TP 지급!` })
      } else {
        setCheckMsg({ ok: true, text: `✅ ${saved.toLocaleString()}보 저장 완료` })
      }
    } catch {
      setCheckMsg({ ok: false, text: '❌ 서버 연결에 실패했습니다. 다시 시도해 주세요.' })
    } finally {
      setChecking(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-sm mx-auto space-y-6 pb-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold">오늘의 만보기</h1>
        <p className="text-sm text-muted-foreground mt-1">
          매일 10,000보 달성 시 <span className="font-semibold text-blue-600">{REWARD_TP} TP</span> 적립
        </p>
      </div>

      {/* 원형 게이지 */}
      <div className="flex justify-center">
        <div className="relative w-56 h-56">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="90" fill="none" stroke="#e5e7eb" strokeWidth="14" />
            <circle cx="100" cy="100" r="90" fill="none"
              stroke={rewarded ? '#16a34a' : isActive ? '#f59e0b' : '#3b5bdb'}
              strokeWidth="14" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              style={{ transition: 'stroke-dashoffset 0.3s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {rewarded
              ? <Trophy className="h-8 w-8 text-yellow-500 mb-1" />
              : <Footprints className={`h-8 w-8 mb-1 ${isActive ? 'text-amber-500 animate-pulse' : 'text-blue-600'}`} />
            }
            <p className="text-4xl font-bold tabular-nums">{totalSteps.toLocaleString()}</p>
            <p className="text-sm font-medium" style={{ color: rewarded ? '#16a34a' : isActive ? '#f59e0b' : '#3b5bdb' }}>{pct}%</p>
            <p className="text-xs text-muted-foreground">/ {GOAL.toLocaleString()}보</p>
          </div>
        </div>
      </div>

      {/* 측정 상태 배너 */}
      <div className={`rounded-xl px-4 py-3 border text-sm text-center font-medium
        ${isActive
          ? 'bg-amber-50 border-amber-200 text-amber-700'
          : 'bg-gray-50 border-gray-200 text-gray-500'
        }`}>
        {saving
          ? '💾 저장 중...'
          : isActive
            ? '🚶 자동 측정 중 (00:01 ~ 23:59)'
            : '⏸ 자정(00:01) 이후 자동 시작됩니다'
        }
      </div>

      {/* APK: 백그라운드 서비스 안내 */}
      {isNative && isActive && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-700 text-center">
          📱 앱이 꺼져도 백그라운드에서 자동 측정됩니다<br />
          <span className="text-blue-500">알림 바의 "TimePay 만보기"가 실행 중임을 나타냅니다</span>
        </div>
      )}

      {/* 웹: 센서 상태 패널 */}
      {!isNative && isActive && (
        <div className={`rounded-xl px-4 py-3 border text-xs ${sensorActive ? 'bg-green-50 border-green-200 text-green-800' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
          <div className="flex items-center gap-2 mb-1">
            {sensorActive
              ? <Activity className="h-4 w-4 text-green-600 shrink-0" />
              : <Cpu className="h-4 w-4 text-gray-400 shrink-0 animate-pulse" />
            }
            {sensorActive ? (
              <span className="font-semibold">
                ✅ 센서 작동 중
                {sensorMode !== 'none' && (
                  <span className="ml-1 font-normal text-green-600">({SENSOR_LABEL[sensorMode]})</span>
                )}
              </span>
            ) : (
              <span>
                {sensorMode === 'none'
                  ? '⏳ 센서 초기화 중…'
                  : `⏳ 신호 대기 중 (${SENSOR_LABEL[sensorMode]})… 걸어보세요`
                }
              </span>
            )}
          </div>
          {sensorActive && (
            <p className="pl-6 text-green-700">가속도: <strong>{debugMag} m/s²</strong> · 수신: {eventCount}회 · 세션: {webSessionSteps}보</p>
          )}
        </div>
      )}

      {/* 목표 달성 */}
      {justRewarded && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-2xl p-5 text-center space-y-2">
          <p className="text-4xl">🎉</p>
          <p className="font-bold text-yellow-800 text-xl">오늘 1만보 달성!</p>
          <p className="text-sm text-yellow-700">
            건강증진 기금에서 <strong className="text-green-700">{REWARD_TP} TP</strong> 적립!
          </p>
          <p className="text-xs text-green-600 mt-1">건강한 당신이 공동체를 지킵니다 💚</p>
        </div>
      )}

      {rewarded && !justRewarded && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center space-y-1">
          <p className="text-green-700 font-semibold text-base">✅ 오늘 {REWARD_TP} TP 적립 완료</p>
          <p className="text-xs text-green-600">건강증진 기금에서 전액 지급됐습니다</p>
          <p className="text-xs text-green-500 mt-1">내일 다시 도전하세요!</p>
        </div>
      )}

      {/* 재원 현황 카드 */}
      <FundStatusCard status={fundStatus} />

      {permError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex gap-2 text-sm text-red-700">
          <CircleOff className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{permError}</span>
        </div>
      )}

      {/* 진단 패널 — 관리자·코디네이터 전용 */}
      {isAdmin && (
        <DebugPanel
          serverSteps={serverSteps}
          webSessionSteps={webSessionSteps}
          isNative={isNative}
          sensorMode={sensorMode}
          sensorActive={sensorActive}
          saveStatus={saveStatus}
        />
      )}

      {/* TP 자동 지급 안내 + 지금 확인 버튼 */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 space-y-3">
        <div className="flex items-start gap-2">
          <Clock className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-indigo-800">TP 자동 지급 안내</p>
            <p className="text-xs text-indigo-600 mt-1 leading-relaxed">
              매일 <strong>오후 11시 59분</strong>에 오늘 걸음수가 자동으로 확인되어
              1만보 달성 회원에게 <strong>0.5 TP</strong>가 지급됩니다.<br />
              지금 바로 확인하려면 아래 버튼을 누르세요.
            </p>
          </div>
        </div>

        {checkMsg && (
          <div className={`rounded-xl px-3 py-2 text-sm font-medium ${
            checkMsg.ok ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
          }`}>
            {checkMsg.text}
          </div>
        )}

        <button
          onClick={handleCheckNow}
          disabled={checking || rewarded}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl py-3 text-sm font-semibold transition-colors"
        >
          {checking
            ? <><RefreshCw className="h-4 w-4 animate-spin" /> 확인 중...</>
            : rewarded
              ? <>✅ 오늘 이미 적립 완료</>
              : <><Footprints className="h-4 w-4" /> 지금 바로 걸음수 확인 및 TP 지급</>
          }
        </button>
      </div>

      {/* 이용 안내 */}
      <div className="bg-blue-50 rounded-xl p-4 space-y-2">
        <p className="text-sm font-semibold text-blue-800">📱 이용 안내</p>
        <ul className="space-y-1 text-xs text-blue-700 list-disc list-inside">
          <li>매일 <strong>00시 01분</strong>에 자동으로 측정 시작</li>
          <li>매일 <strong>23시 59분</strong>에 서버에서 자동으로 TP 일괄 지급</li>
          <li><strong>APK 설치 시</strong>: 앱을 닫아도 백그라운드에서 계속 측정</li>
          <li><strong>웹 브라우저</strong>: 화면이 열려 있어야 측정됨</li>
          <li>10,000보 달성 시 하루 1회 <strong>{REWARD_TP} TP</strong> 자동 적립</li>
        </ul>
      </div>
    </div>
  )
}
