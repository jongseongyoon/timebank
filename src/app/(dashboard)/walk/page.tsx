'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Footprints, Trophy, CircleOff, Activity, Cpu, Heart, Bug, ChevronDown, ChevronUp, RefreshCw, FlaskConical } from 'lucide-react'

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
  serverSteps, webSessionSteps, isNative, sensorMode, sensorActive,
}: {
  serverSteps: number; webSessionSteps: number; isNative: boolean
  sensorMode: string; sensorActive: boolean
}) {
  const [open,    setOpen]    = useState(false)
  const [info,    setInfo]    = useState<DebugInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [testing,    setTesting]    = useState(false)

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

  useEffect(() => {
    if (open && !info) loadDebug()
  }, [open])

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden">
      {/* 헤더 토글 */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-sm text-gray-600 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Bug className="h-4 w-4" />
          <span className="font-medium">진단 & 테스트 패널</span>
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && (
        <div className="p-4 space-y-4 text-xs">

          {/* 현재 세션 상태 */}
          <div className="space-y-1">
            <p className="font-semibold text-gray-700">📊 현재 세션 상태</p>
            <div className="bg-gray-50 rounded-xl p-3 space-y-1 font-mono text-gray-600">
              <p>플랫폼: <span className="text-blue-600 font-bold">{isNative ? '📱 APK (Capacitor)' : '🌐 웹 브라우저'}</span></p>
              <p>서버 저장 걸음 수: <span className="text-indigo-700 font-bold">{serverSteps.toLocaleString()}보</span></p>
              {!isNative && <p>이번 세션 측정: <span className="text-amber-700 font-bold">{webSessionSteps.toLocaleString()}보</span></p>}
              <p>센서 모드: <span className="text-gray-500">{sensorMode === 'none' ? '비활성' : sensorMode}</span></p>
              <p>센서 수신: <span className={sensorActive ? 'text-green-600 font-bold' : 'text-gray-400'}>{sensorActive ? '✅ 활성' : '⏸ 대기'}</span></p>
            </div>
          </div>

          {/* 서버 진단 정보 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-gray-700">🔍 서버 진단</p>
              <button
                onClick={loadDebug}
                disabled={loading}
                className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                새로고침
              </button>
            </div>

            {loading && <p className="text-gray-400 text-center py-2">불러오는 중...</p>}

            {info && (
              <div className="space-y-3">
                {/* 진단 결론 */}
                <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                  {info.diagnosis.map((d, i) => (
                    <p key={i} className={`font-medium ${
                      d.startsWith('✅') ? 'text-green-700' :
                      d.startsWith('❌') ? 'text-red-600' :
                      'text-amber-600'
                    }`}>{d}</p>
                  ))}
                </div>

                {/* 시스템 상태 */}
                <div className="bg-blue-50 rounded-xl p-3 space-y-1 font-mono text-blue-800">
                  <p>건강기금 잔액: <strong>{info.system.healthFundBalance} TP</strong>
                    {info.system.healthFundOk ? ' ✅' : ' ❌ 부족'}
                  </p>
                  <p>연간 발행: {info.system.annualIssued} / {info.system.annualLimit} TP
                    {info.system.annualExceeded ? ' ❌ 초과' : ' ✅'}
                  </p>
                  <p>WalkRewardConfig: {info.system.walkConfigExists ? '✅ 있음' : '❌ 없음'}</p>
                  <p>내 TP 잔액: <strong>{info.tpBalance} TP</strong></p>
                </div>

                {/* 오늘 기록 */}
                <div>
                  <p className="font-semibold text-gray-600 mb-1">오늘 ({info.today}) WalkRecord</p>
                  {info.todayRecord ? (
                    <div className="bg-green-50 rounded-xl p-3 font-mono text-green-800 space-y-1">
                      <p>걸음 수: <strong>{info.todayRecord.steps.toLocaleString()}보</strong></p>
                      <p>TP 지급: <strong>{info.todayRecord.rewarded ? `✅ ${info.todayRecord.tpFromFund} TP` : '❌ 미지급'}</strong></p>
                      {info.todayRecord.tpSource && <p>재원: {info.todayRecord.tpSource}</p>}
                      {info.todayRecord.tpAwardedAt && <p>지급 시각: {new Date(info.todayRecord.tpAwardedAt).toLocaleTimeString('ko-KR')}</p>}
                      <p className="text-green-600">생성: {new Date(info.todayRecord.createdAt).toLocaleString('ko-KR')}</p>
                    </div>
                  ) : (
                    <div className="bg-red-50 rounded-xl p-3 text-red-600">
                      ❌ 오늘 WalkRecord 없음 — 걸음 수 저장이 한 번도 실행되지 않았습니다.
                    </div>
                  )}
                </div>

                {/* 최근 기록 */}
                {info.recentRecords.length > 0 && (
                  <div>
                    <p className="font-semibold text-gray-600 mb-1">최근 WalkRecord (최대 10개)</p>
                    <div className="bg-gray-50 rounded-xl p-3 space-y-1 font-mono text-gray-700">
                      {info.recentRecords.map(r => (
                        <p key={r.date}>
                          {r.date} — {r.steps.toLocaleString()}보
                          {r.rewarded ? ` ✅ ${r.tpFromFund}TP` : ' ⬜'}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-gray-400 text-right">갱신: {new Date(info.timestamp).toLocaleTimeString('ko-KR')}</p>
              </div>
            )}
          </div>

          {/* 테스트 버튼 */}
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <p className="font-semibold text-gray-700 flex items-center gap-1">
              <FlaskConical className="h-3.5 w-3.5" />
              테스트
            </p>

            {testResult && (
              <div className={`rounded-xl px-3 py-2 font-medium ${
                testResult.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {testResult}
              </div>
            )}

            <button
              onClick={runTestReward}
              disabled={testing}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl py-2.5 font-medium transition-colors"
            >
              {testing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Footprints className="h-4 w-4" />}
              테스트: 10,000보 달성으로 강제 저장 및 TP 지급
            </button>

            <button
              onClick={runForceReward}
              disabled={testing}
              className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl py-2 font-medium transition-colors"
            >
              {testing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
              강제 재지급 (이미 지급된 경우도 재실행)
            </button>

            <p className="text-gray-400 text-center">⚠️ 테스트 버튼은 진단 목적입니다. 실제 TP가 지급됩니다.</p>
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
function useNativeStepSync(serverSteps: number, onSynced: (info: SyncedInfo) => void) {
  const [nativeSteps, setNativeSteps] = useState(serverSteps)
  const [inWindow, setInWindow] = useState(isTrackingHour())
  const serverStepsRef = useRef(serverSteps)

  useEffect(() => { serverStepsRef.current = serverSteps }, [serverSteps])

  useEffect(() => {
    if (!isCapacitorNative()) return
    const plugin = getStepPlugin()
    if (!plugin) return

    // pending_save 서버 동기화 (앱 열릴 때 1회)
    async function syncPending() {
      try {
        const { pending, steps, date } = await plugin.getPendingSave()
        if (!pending || steps <= 0) return
        const today = new Date().toISOString().slice(0, 10)
        const diffDays = Math.floor((new Date(today).getTime() - new Date(date).getTime()) / 86400000)
        if (diffDays < 0 || diffDays > 1) return
        const res = await fetch('/api/walk/steps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ steps, date }),
        })
        if (res.ok) {
          const d = await res.json()
          onSynced({ steps: d.steps, rewarded: d.rewarded, rewardedNow: !!d.rewardedNow, tpFromFund: d.tpFromFund, tpFromCirc: d.tpFromCirculation })
          await plugin.markSaved()
        }
      } catch {}
    }
    syncPending()

    // SharedPreferences에서 걸음 수 폴링 (5초마다)
    async function poll() {
      try {
        const { steps } = await plugin.getTodaySteps()
        setNativeSteps(steps ?? 0)
      } catch {}
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
      if (d.rewarded && d.tpFromFund != null) {
        setRewardSource({ fromFund: d.tpFromFund, fromCirc: d.tpFromCirculation ?? 0 })
      }
      if (fs && !fs.error) setFundStatus(fs)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const { displaySteps: nativeDisplaySteps, inWindow } = useNativeStepSync(
    serverSteps,
    ({ steps, rewarded: rew, rewardedNow: rewNow, tpFromFund, tpFromCirc }) => {
      setServerSteps(steps)
      serverStepsRef.current = steps
      setRewarded(rew)
      if (rewNow) {
        setJustRewarded(true)
        if (tpFromFund != null) setRewardSource({ fromFund: tpFromFund, fromCirc: tpFromCirc ?? 0 })
      }
    }
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

  useEffect(() => {
    if (loading) return
    const now = new Date()
    const midnight = new Date(now)
    midnight.setHours(24, 0, 0, 0)
    const timer = setTimeout(() => {
      setServerSteps(0)
      serverStepsRef.current = 0
      webSessionRef.current = 0
      setWebSessionSteps(0)
      setRewarded(false)
      setJustRewarded(false)
    }, midnight.getTime() - now.getTime())
    return () => clearTimeout(timer)
  }, [loading])

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

      {/* 디버그 & 테스트 패널 */}
      <DebugPanel
        serverSteps={serverSteps}
        webSessionSteps={webSessionSteps}
        isNative={isNative}
        sensorMode={sensorMode}
        sensorActive={sensorActive}
      />

      {/* 이용 안내 */}
      <div className="bg-blue-50 rounded-xl p-4 space-y-2">
        <p className="text-sm font-semibold text-blue-800">📱 이용 안내</p>
        <ul className="space-y-1 text-xs text-blue-700 list-disc list-inside">
          <li>매일 <strong>00시 01분</strong>에 자동으로 측정 시작</li>
          <li>매일 <strong>23시 59분</strong>에 자동으로 측정 종료 및 저장</li>
          <li><strong>APK 설치 시</strong>: 앱을 닫아도 백그라운드에서 계속 측정</li>
          <li><strong>웹 브라우저</strong>: 화면이 열려 있어야 측정됨</li>
          <li>10,000보 달성 시 하루 1회 <strong>{REWARD_TP} TP</strong> 자동 적립</li>
        </ul>
      </div>
    </div>
  )
}
