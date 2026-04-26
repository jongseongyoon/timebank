'use client'

import { useEffect, useRef, useState } from 'react'
import { Footprints, Trophy, CircleOff, Play, Square, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'

const GOAL = 10000
const REWARD_TP = 0.5

export default function WalkPage() {
  const [loading, setLoading] = useState(true)
  const [todaySteps, setTodaySteps] = useState(0)
  const [sessionSteps, setSessionSteps] = useState(0)
  const [rewarded, setRewarded] = useState(false)
  const [tracking, setTracking] = useState(false)
  const [permError, setPermError] = useState('')
  const [saving, setSaving] = useState(false)
  const [justRewarded, setJustRewarded] = useState(false)

  // 디버그: 센서 작동 여부 확인
  const [sensorActive, setSensorActive] = useState(false)
  const [debugMag, setDebugMag] = useState(0)
  const [eventCount, setEventCount] = useState(0)

  // Refs — 이벤트 핸들러에서 stale closure 방지
  const lastMagRef = useRef(0)
  const risingRef = useRef(false)
  const lastStepTimeRef = useRef(0)
  const sessionStepsRef = useRef(0)
  const todayStepsRef = useRef(0)
  const handlerRef = useRef<((e: DeviceMotionEvent) => void) | null>(null)
  const eventCountRef = useRef(0)

  // 적응형 기준선: 중력 방향에 무관하게 걸음 감지
  const baselineRef = useRef(9.81)   // 초기값 = 중력 크기
  const baselineInitRef = useRef(false)

  // 오늘 기록 로드
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

  // ──────────────────────────────────────────────────────────────
  // 걸음 감지 핵심 로직
  //
  // ✅ Android S23 Ultra 호환 포인트:
  //  1) e.acceleration.x === null 인 경우가 많음 → accelerationIncludingGravity 사용
  //  2) 적응형 기준선(EMA)으로 폰 방향/중력 방향 무관하게 피크 감지
  //  3) 상승→하강 전환 시 기준선보다 충분히 높은 피크면 걸음 카운트
  // ──────────────────────────────────────────────────────────────
  function motionHandler(e: DeviceMotionEvent) {
    // 1. 순수 가속도(중력 제거) 사용 가능 여부 확인 — null 값 체크 필수
    const purAcc = e.acceleration
    const purValid =
      purAcc !== null &&
      purAcc !== undefined &&
      purAcc.x !== null &&
      purAcc.y !== null &&
      purAcc.z !== null

    // 2. 중력 포함 가속도 — Android에서 항상 제공
    const gravAcc = e.accelerationIncludingGravity
    const gravValid =
      gravAcc !== null &&
      gravAcc !== undefined &&
      gravAcc.x !== null &&
      gravAcc.y !== null &&
      gravAcc.z !== null

    if (!purValid && !gravValid) return

    // 3. 벡터 크기(magnitude) 계산
    let mag: number
    if (purValid) {
      // 순수 가속도 사용 (iOS 등)
      const ax = purAcc!.x!
      const ay = purAcc!.y!
      const az = purAcc!.z ?? 0
      mag = Math.sqrt(ax * ax + ay * ay + az * az)
    } else {
      // 중력 포함 가속도 사용 (Android 대부분)
      const ax = gravAcc!.x!
      const ay = gravAcc!.y!
      const az = gravAcc!.z!
      mag = Math.sqrt(ax * ax + ay * ay + az * az)
    }

    // 4. 디버그 업데이트 (10회마다 리렌더 방지)
    eventCountRef.current += 1
    if (eventCountRef.current % 10 === 0) {
      setSensorActive(true)
      setDebugMag(Math.round(mag * 10) / 10)
      setEventCount(eventCountRef.current)
    }

    // 5. 적응형 기준선 초기화 (첫 50회 데이터로 기준 설정)
    if (!baselineInitRef.current) {
      baselineRef.current = mag
      baselineInitRef.current = true
    }

    // 6. 지수 이동 평균(EMA)으로 기준선 업데이트
    //    alpha=0.005: 느리게 추적 → 걷는 중 기준선이 올라가지 않음
    const alpha = 0.005
    baselineRef.current = alpha * mag + (1 - alpha) * baselineRef.current

    // 7. 피크 감지: 상승 → 하강 전환 시 걸음 1회
    //    순수 가속도: 피크 > baseline + 1.2 m/s²
    //    중력 포함:  피크 > baseline + 1.5 m/s²  (중력 진동 필터링)
    const STEP_DELTA = purValid ? 1.2 : 1.5
    const COOLDOWN_MS = 280   // 최소 걸음 간격 (분당 최대 214보)

    if (mag > lastMagRef.current) {
      risingRef.current = true
    } else if (risingRef.current) {
      // 하강 시작 — 직전 피크가 기준선보다 충분히 높았는지 확인
      if (lastMagRef.current > baselineRef.current + STEP_DELTA) {
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

  // ──────────────────────────────────────────────────────────────

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

  async function startTracking() {
    // iOS 13+ 센서 권한 요청 (Android는 권한 불필요)
    if (
      typeof DeviceMotionEvent !== 'undefined' &&
      typeof (DeviceMotionEvent as any).requestPermission === 'function'
    ) {
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

    // 디버그 초기화
    setSensorActive(false)
    setEventCount(0)
    eventCountRef.current = 0
    baselineInitRef.current = false
    baselineRef.current = 9.81
    lastMagRef.current = 0
    risingRef.current = false

    setPermError('')
    handlerRef.current = motionHandler
    window.addEventListener('devicemotion', motionHandler)
    setTracking(true)
  }

  async function stopTracking() {
    if (handlerRef.current) {
      window.removeEventListener('devicemotion', handlerRef.current)
      handlerRef.current = null
    }
    setTracking(false)
    await saveCurrentSteps()
  }

  useEffect(() => {
    return () => {
      if (handlerRef.current) {
        window.removeEventListener('devicemotion', handlerRef.current)
      }
    }
  }, [])

  const totalSteps = todaySteps + sessionSteps
  const progress = Math.min(totalSteps / GOAL, 1)
  const circumference = 2 * Math.PI * 90
  const pct = Math.round(progress * 100)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-sm mx-auto space-y-6 pb-8">
      {/* 헤더 */}
      <div className="text-center">
        <h1 className="text-2xl font-bold">오늘의 만보기</h1>
        <p className="text-sm text-muted-foreground mt-1">
          매일 10,000보 달성 시 <span className="font-semibold text-blue-600">{REWARD_TP} TP</span> 적립
        </p>
      </div>

      {/* 원형 진행 게이지 */}
      <div className="flex justify-center">
        <div className="relative w-56 h-56">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="90"
              fill="none" stroke="#e5e7eb" strokeWidth="14" />
            <circle cx="100" cy="100" r="90"
              fill="none"
              stroke={rewarded ? '#16a34a' : tracking ? '#f59e0b' : '#3b5bdb'}
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
              style={{ transition: 'stroke-dashoffset 0.3s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {rewarded
              ? <Trophy className="h-8 w-8 text-yellow-500 mb-1" />
              : <Footprints className={`h-8 w-8 mb-1 ${tracking ? 'text-amber-500 animate-pulse' : 'text-blue-600'}`} />
            }
            <p className="text-4xl font-bold tabular-nums">{totalSteps.toLocaleString()}</p>
            <p className="text-sm font-medium" style={{ color: rewarded ? '#16a34a' : tracking ? '#f59e0b' : '#3b5bdb' }}>
              {pct}%
            </p>
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

          {/* 센서 상태 디버그 패널 */}
          <div className={`rounded-xl px-4 py-3 border text-xs flex items-center gap-3 ${
            sensorActive
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-gray-50 border-gray-200 text-gray-500'
          }`}>
            <Activity className={`h-4 w-4 shrink-0 ${sensorActive ? 'text-green-600' : 'text-gray-400'}`} />
            <div>
              {sensorActive ? (
                <>
                  <p className="font-semibold">✅ 센서 정상 작동 중</p>
                  <p>가속도: <strong>{debugMag} m/s²</strong> · 수신 이벤트: {eventCount}회</p>
                </>
              ) : (
                <p>⏳ 센서 신호 대기 중… 폰을 흔들어 보세요</p>
              )}
            </div>
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

      {/* 센서 오류 */}
      {permError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex gap-2 text-sm text-red-700">
          <CircleOff className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{permError}</span>
        </div>
      )}

      {/* 제어 버튼 */}
      {tracking ? (
        <Button
          onClick={stopTracking}
          variant="outline"
          className="w-full h-14 text-base gap-2 border-red-300 text-red-600 hover:bg-red-50"
          disabled={saving}
        >
          <Square className="h-5 w-5" />
          {saving ? '저장 중...' : '측정 중지 및 저장'}
        </Button>
      ) : (
        <Button
          onClick={startTracking}
          className="w-full h-14 text-base gap-2"
          disabled={rewarded}
        >
          <Play className="h-5 w-5" />
          {rewarded ? '오늘 목표 달성 완료!' : '걷기 측정 시작'}
        </Button>
      )}

      {/* 이용 안내 */}
      <div className="bg-blue-50 rounded-xl p-4 space-y-2">
        <p className="text-sm font-semibold text-blue-800">📱 이용 안내</p>
        <ul className="space-y-1 text-xs text-blue-700 list-disc list-inside">
          <li>측정 시작 후 스마트폰을 손에 들거나 주머니에 넣고 걸으세요</li>
          <li>센서 작동 패널에 <strong>초록불 + 가속도 수치</strong>가 보이면 정상입니다</li>
          <li>매일 자정에 걸음 수가 초기화됩니다</li>
          <li>10,000보 달성 시 하루 1회 <strong>{REWARD_TP} TP</strong> 자동 적립</li>
          <li>중지 버튼을 눌러야 걸음 수가 저장됩니다</li>
        </ul>
      </div>
    </div>
  )
}
