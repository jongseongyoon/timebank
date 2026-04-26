'use client'

import { useEffect, useRef, useState } from 'react'
import { Footprints, Trophy, CircleOff, Play, Square, Activity, Cpu } from 'lucide-react'
import { Button } from '@/components/ui/button'

const GOAL = 10000
const REWARD_TP = 0.5
const COOLDOWN_MS = 280
const STEP_DELTA_PURE = 1.2
const STEP_DELTA_GRAVITY = 2.0
const EMA_ALPHA = 0.005

// Capacitor 네이티브 StepCounter 플러그인 타입
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

export default function WalkPage() {
  const [loading, setLoading] = useState(true)
  const [todaySteps, setTodaySteps] = useState(0)
  const [sessionSteps, setSessionSteps] = useState(0)
  const [rewarded, setRewarded] = useState(false)
  const [tracking, setTracking] = useState(false)
  const [permError, setPermError] = useState('')
  const [saving, setSaving] = useState(false)
  const [justRewarded, setJustRewarded] = useState(false)

  // 센서 디버그
  const [sensorMode, setSensorMode] = useState<'none' | 'native' | 'generic' | 'devicemotion'>('none')
  const [sensorActive, setSensorActive] = useState(false)
  const [debugMag, setDebugMag] = useState(0)
  const [eventCount, setEventCount] = useState(0)

  const lastMagRef = useRef(0)
  const risingRef = useRef(false)
  const lastStepTimeRef = useRef(0)
  const sessionStepsRef = useRef(0)
  const todayStepsRef = useRef(0)
  const motionHandlerRef = useRef<((e: DeviceMotionEvent) => void) | null>(null)
  const sensorRef = useRef<any>(null)
  const nativeListenerRef = useRef<any>(null)
  const eventCountRef = useRef(0)
  const baselineRef = useRef(9.81)
  const baselineInitRef = useRef(false)

  useEffect(() => {
    fetch('/api/walk/today')
      .then(r => r.json())
      .then(d => {
        const s = d.steps ?? 0
        setTodaySteps(s)
        todayStepsRef.current = s
        setRewarded(d.rewarded ?? false)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // ── 걸음 감지 (웹 센서용)
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
          sessionStepsRef.current += 1
          setSessionSteps(s => s + 1)
          lastStepTimeRef.current = now
        }
      }
      risingRef.current = false
    }
    lastMagRef.current = mag
  }

  // ── [방식 1] Capacitor 네이티브 만보기 (APK 전용, 가장 정확)
  async function tryNativeStepCounter(): Promise<boolean> {
    if (!isCapacitorNative()) return false
    const plugin = getStepPlugin()
    if (!plugin) return false
    try {
      const { available } = await plugin.isAvailable()
      if (!available) return false

      // Android 10+ 권한 요청
      if (typeof plugin.requestPermission === 'function') {
        const { granted } = await plugin.requestPermission()
        if (!granted) return false
      }

      await plugin.start()

      // 실시간 걸음 이벤트 수신
      nativeListenerRef.current = await plugin.addListener('stepUpdate', (data: { steps: number }) => {
        const steps = data.steps
        sessionStepsRef.current = steps
        setSessionSteps(steps)
        setSensorActive(true)
        eventCountRef.current += 1
        setEventCount(eventCountRef.current)
      })

      setSensorMode('native')
      setSensorActive(false) // 첫 걸음 전까지 대기
      return true
    } catch {
      return false
    }
  }

  // ── [방식 2] Generic Sensor API
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

  // ── [방식 3] DeviceMotionEvent (iOS + 구형 Android)
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

  async function startTracking() {
    // iOS 권한
    if (typeof DeviceMotionEvent !== 'undefined' && typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const result = await (DeviceMotionEvent as any).requestPermission()
        if (result !== 'granted') {
          setPermError('동작 센서 권한이 필요합니다. iOS 설정 > Safari > 모션 및 방향을 허용해 주세요.')
          return
        }
      } catch {
        setPermError('센서 권한 요청에 실패했습니다.')
        return
      }
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
    setTracking(true)

    // 우선순위: 네이티브(APK) → Generic Sensor → DeviceMotion
    const nativeOk = await tryNativeStepCounter()
    if (!nativeOk) {
      const genericOk = await tryGenericSensor()
      if (!genericOk) tryDeviceMotion()
    }
  }

  async function stopTracking() {
    // 네이티브 플러그인 정리
    if (nativeListenerRef.current) {
      try { await nativeListenerRef.current.remove() } catch {}
      nativeListenerRef.current = null
    }
    const plugin = getStepPlugin()
    if (plugin && isCapacitorNative()) {
      try { await plugin.stop() } catch {}
    }
    // Generic Sensor 정리
    if (sensorRef.current) {
      try { sensorRef.current.stop() } catch {}
      sensorRef.current = null
    }
    // DeviceMotion 정리
    if (motionHandlerRef.current) {
      window.removeEventListener('devicemotion', motionHandlerRef.current)
      motionHandlerRef.current = null
    }
    setTracking(false)
    setSensorMode('none')
    setSensorActive(false)
    await saveCurrentSteps()
  }

  async function saveCurrentSteps() {
    const total = todayStepsRef.current + sessionStepsRef.current
    if (total <= todayStepsRef.current) return
    setSaving(true)
    try {
      const res = await fetch('/api/walk/steps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps: total }),
      })
      const d = await res.json()
      if (res.ok) {
        setTodaySteps(d.steps)
        todayStepsRef.current = d.steps
        setRewarded(d.rewarded)
        if (d.rewardedNow) setJustRewarded(true)
        sessionStepsRef.current = 0
        setSessionSteps(0)
      }
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    return () => {
      if (nativeListenerRef.current) { try { nativeListenerRef.current.remove() } catch {} }
      if (sensorRef.current) { try { sensorRef.current.stop() } catch {} }
      if (motionHandlerRef.current) window.removeEventListener('devicemotion', motionHandlerRef.current)
    }
  }, [])

  const totalSteps = todaySteps + sessionSteps
  const progress = Math.min(totalSteps / GOAL, 1)
  const circumference = 2 * Math.PI * 90
  const pct = Math.round(progress * 100)

  const SENSOR_LABEL: Record<string, string> = {
    native: '📱 네이티브 센서 (APK)',
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
              stroke={rewarded ? '#16a34a' : tracking ? '#f59e0b' : '#3b5bdb'}
              strokeWidth="14" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              style={{ transition: 'stroke-dashoffset 0.3s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {rewarded ? <Trophy className="h-8 w-8 text-yellow-500 mb-1" />
              : <Footprints className={`h-8 w-8 mb-1 ${tracking ? 'text-amber-500 animate-pulse' : 'text-blue-600'}`} />
            }
            <p className="text-4xl font-bold tabular-nums">{totalSteps.toLocaleString()}</p>
            <p className="text-sm font-medium" style={{ color: rewarded ? '#16a34a' : tracking ? '#f59e0b' : '#3b5bdb' }}>{pct}%</p>
            <p className="text-xs text-muted-foreground">/ {GOAL.toLocaleString()}보</p>
          </div>
        </div>
      </div>

      {/* 측정 중 상태 */}
      {tracking && (
        <div className="space-y-2">
          <div className="text-center bg-amber-50 rounded-xl py-3 border border-amber-200">
            <p className="text-sm text-amber-700">
              이번 세션: <strong className="text-amber-800">{sessionSteps.toLocaleString()}보</strong>
            </p>
          </div>

          {/* 센서 상태 패널 */}
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
            {sensorActive && sensorMode !== 'native' && (
              <p className="pl-6 text-green-700">가속도: <strong>{debugMag} m/s²</strong> · 수신: {eventCount}회</p>
            )}
            {sensorActive && sensorMode === 'native' && (
              <p className="pl-6 text-green-700">세션 걸음: <strong>{sessionSteps}보</strong> · 이벤트: {eventCount}회</p>
            )}
          </div>
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

      {/* 제어 버튼 */}
      {tracking ? (
        <Button onClick={stopTracking} variant="outline" className="w-full h-14 text-base gap-2 border-red-300 text-red-600 hover:bg-red-50" disabled={saving}>
          <Square className="h-5 w-5" />
          {saving ? '저장 중...' : '측정 중지 및 저장'}
        </Button>
      ) : (
        <Button onClick={startTracking} className="w-full h-14 text-base gap-2" disabled={rewarded}>
          <Play className="h-5 w-5" />
          {rewarded ? '오늘 목표 달성 완료!' : '걷기 측정 시작'}
        </Button>
      )}

      {/* 이용 안내 */}
      <div className="bg-blue-50 rounded-xl p-4 space-y-2">
        <p className="text-sm font-semibold text-blue-800">📱 이용 안내</p>
        <ul className="space-y-1 text-xs text-blue-700 list-disc list-inside">
          <li><strong>APK 설치 시</strong>: 기기 내장 만보기 센서로 정확하게 측정</li>
          <li><strong>웹 브라우저</strong>: 가속도 센서로 측정 (정확도 낮을 수 있음)</li>
          <li>측정 시작 후 스마트폰을 손에 들거나 주머니에 넣고 걸으세요</li>
          <li>매일 자정에 걸음 수가 초기화됩니다</li>
          <li>10,000보 달성 시 하루 1회 <strong>{REWARD_TP} TP</strong> 자동 적립</li>
          <li>중지 버튼을 눌러야 걸음 수가 저장됩니다</li>
        </ul>
      </div>
    </div>
  )
}
