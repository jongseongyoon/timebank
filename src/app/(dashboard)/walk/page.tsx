'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Footprints, Trophy, CircleOff, Activity, Cpu } from 'lucide-react'

const GOAL = 10000
const REWARD_TP = 0.5
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
function useNativeStepSync(serverSteps: number, onSynced: (steps: number, rewarded: boolean, rewardedNow: boolean) => void) {
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
        if (date !== today) return
        const res = await fetch('/api/walk/steps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ steps }),
        })
        if (res.ok) {
          const d = await res.json()
          onSynced(d.steps, d.rewarded, !!d.rewardedNow)
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

  // 최댓값: 서버 저장 값 vs 네이티브 실시간 값
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

    // 우선순위: Generic Sensor → DeviceMotion
    const genericOk = await tryGenericSensor()
    if (!genericOk) tryDeviceMotion()
  }, [])

  // 시각 기반 자동 시작/중지
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

  const isNative = isCapacitorNative()

  // 서버에서 오늘 걸음 수 로드
  useEffect(() => {
    fetch('/api/walk/today')
      .then(r => r.json())
      .then(d => {
        const s = d.steps ?? 0
        setServerSteps(s)
        serverStepsRef.current = s
        setRewarded(d.rewarded ?? false)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // APK: 네이티브 서비스 걸음 수 폴링
  const { displaySteps: nativeDisplaySteps, inWindow } = useNativeStepSync(
    serverSteps,
    (steps, rew, rewNow) => {
      setServerSteps(steps)
      serverStepsRef.current = steps
      setRewarded(rew)
      if (rewNow) setJustRewarded(true)
    }
  )

  // 웹: 센서 기반 자동 측정 (APK가 아닐 때만)
  const onWebStep = useCallback(() => {
    webSessionRef.current += 1
    setWebSessionSteps(webSessionRef.current)
  }, [])

  const { tracking: webTracking, sensorMode, sensorActive, debugMag, eventCount, permError } =
    useWebSensorTracking(!isNative && !loading, onWebStep)

  // 웹: 측정 중지 시 서버 저장
  const prevWebTracking = useRef(webTracking)
  useEffect(() => {
    if (prevWebTracking.current && !webTracking) {
      // 중지됨 → 저장
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
              if (d.rewardedNow) setJustRewarded(true)
              webSessionRef.current = 0
              setWebSessionSteps(0)
            }
          })
          .finally(() => setSaving(false))
      }
    }
    prevWebTracking.current = webTracking
  }, [webTracking])

  // 자정 리셋
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

  // 표시용 계산
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
          <p className="font-bold text-yellow-800 text-lg">10,000보 달성!</p>
          <p className="text-sm text-yellow-700">{REWARD_TP} TP가 지갑에 자동 적립됐습니다</p>
        </div>
      )}

      {rewarded && !justRewarded && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
          <p className="text-green-700 font-semibold">✅ 오늘 {REWARD_TP} TP 이미 적립됨</p>
          <p className="text-xs text-green-500 mt-1">내일 다시 도전하세요!</p>
        </div>
      )}

      {permError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex gap-2 text-sm text-red-700">
          <CircleOff className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{permError}</span>
        </div>
      )}

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
