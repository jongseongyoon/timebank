'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { CircleOff, Activity, Cpu } from 'lucide-react'
import { FundStatusCard, type FundStatus } from '@/components/walk/FundStatusCard'
import { DebugPanel }       from '@/components/walk/DebugPanel'
import { WalkCircleGauge }  from '@/components/walk/WalkCircleGauge'
import { WalkCheckCard }    from '@/components/walk/WalkCheckCard'
import { useNativeStepSync, type SaveStatus } from './useNativeStepSync'
import { useWebSensorTracking }               from './useWebSensorTracking'
import { isCapacitorNative, getStepPlugin, GOAL, REWARD_TP } from './walkUtils'

const SENSOR_LABEL: Record<string, string> = {
  generic: '🔬 Generic Sensor', devicemotion: '📡 DeviceMotion', none: '',
}

export default function WalkPage() {
  const [loading,        setLoading]        = useState(true)
  const [serverSteps,    setServerSteps]    = useState(0)
  const [rewarded,       setRewarded]       = useState(false)
  const [justRewarded,   setJustRewarded]   = useState(false)
  const [saving,         setSaving]         = useState(false)
  const [webSessionSteps, setWebSessionSteps] = useState(0)
  const [rewardSource,   setRewardSource]   = useState<{ fromFund: number; fromCirc: number } | null>(null)
  const [fundStatus,     setFundStatus]     = useState<FundStatus | null>(null)
  const [checking,       setChecking]       = useState(false)
  const [checkMsg,       setCheckMsg]       = useState<{ ok: boolean; text: string } | null>(null)
  const [saveStatus,     setSaveStatus]     = useState<SaveStatus | null>(null)
  const [isAdmin,        setIsAdmin]        = useState(false)
  const webSessionRef  = useRef(0)
  const serverStepsRef = useRef(0)
  const isNative = isCapacitorNative()

  useEffect(() => {
    Promise.all([
      fetch('/api/walk/today').then(r => r.json()),
      fetch('/api/walk/fund-status').then(r => r.json()).catch(() => null),
    ]).then(([d, fs]) => {
      const s = d.steps ?? 0
      setServerSteps(s); serverStepsRef.current = s
      setRewarded(d.rewarded ?? false); setIsAdmin(!!d.isAdmin)
      if (d.rewarded && d.tpFromFund != null) setRewardSource({ fromFund: d.tpFromFund, fromCirc: d.tpFromCirculation ?? 0 })
      if (fs && !fs.error) setFundStatus(fs)
      setLoading(false)
      // 네이티브 앱은 useNativeStepSync가 즉시 poll()로 처리 → 여기서 중복 호출 방지
      if (s >= 10000 && !d.rewarded && !isCapacitorNative()) {
        fetch('/api/walk/steps', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ steps: s }) })
          .then(r => r.json()).then(result => {
            if (result.rewardedNow) {
              setRewarded(true); setJustRewarded(true)
              if (result.tpFromFund != null) setRewardSource({ fromFund: result.tpFromFund, fromCirc: result.tpFromCirculation ?? 0 })
            }
          }).catch(() => {})
      }
    }).catch(() => setLoading(false))
  }, [])

  const { displaySteps: nativeDisplaySteps, inWindow } = useNativeStepSync(
    serverSteps, rewarded,
    ({ steps, rewarded: rew, rewardedNow: rewNow, tpFromFund, tpFromCirc }) => {
      setServerSteps(steps); serverStepsRef.current = steps; setRewarded(rew)
      if (rewNow) { setJustRewarded(true); if (tpFromFund != null) setRewardSource({ fromFund: tpFromFund, fromCirc: tpFromCirc ?? 0 }) }
    },
    setSaveStatus,
  )

  const onWebStep = useCallback(() => { webSessionRef.current += 1; setWebSessionSteps(webSessionRef.current) }, [])
  const { tracking: webTracking, sensorMode, sensorActive, debugMag, eventCount, permError } =
    useWebSensorTracking(!isNative && !loading, onWebStep)

  // 탭 닫기·페이지 이동 시 웹 세션 걸음 수 손실 방지
  // sendBeacon은 비동기·비차단으로 동작하며 세션 쿠키를 자동으로 전송함
  useEffect(() => {
    if (isNative) return   // 네이티브는 useNativeStepSync가 저장을 전담
    function handleBeforeUnload() {
      const sessionSteps = webSessionRef.current
      if (sessionSteps <= 0) return
      const total = serverStepsRef.current + sessionSteps
      navigator.sendBeacon(
        '/api/walk/record',
        new Blob([JSON.stringify({ steps: total })], { type: 'application/json' }),
      )
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isNative])

  const prevWebTracking = useRef(webTracking)
  useEffect(() => {
    if (prevWebTracking.current && !webTracking) {
      const total = serverStepsRef.current + webSessionRef.current
      if (total > serverStepsRef.current && webSessionRef.current > 0) {
        setSaving(true)
        fetch('/api/walk/steps', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ steps: total }) })
          .then(r => r.json()).then(d => {
            if (d.steps) {
              setServerSteps(d.steps); serverStepsRef.current = d.steps; setRewarded(d.rewarded)
              if (d.rewardedNow) { setJustRewarded(true); if (d.tpFromFund != null) setRewardSource({ fromFund: d.tpFromFund, fromCirc: d.tpFromCirculation ?? 0 }) }
              webSessionRef.current = 0; setWebSessionSteps(0)
            }
          }).finally(() => setSaving(false))
      }
    }
    prevWebTracking.current = webTracking
  }, [webTracking])

  async function handleCheckNow() {
    setChecking(true); setCheckMsg(null)
    try {
      let stepsToSave = isNative ? nativeDisplaySteps : serverSteps + webSessionSteps
      if (isNative) {
        const plugin = getStepPlugin()
        if (plugin) {
          try { const { steps: freshSteps } = await plugin.getTodaySteps(); if (typeof freshSteps === 'number' && freshSteps > 0) stepsToSave = Math.max(stepsToSave, freshSteps) } catch {}
        }
      }
      const res = await fetch('/api/walk/steps', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ steps: stepsToSave }) })
      const d   = await res.json()
      const saved = d.steps ?? stepsToSave
      setServerSteps(saved); serverStepsRef.current = saved
      if (d.rewardedNow) {
        setRewarded(true); setJustRewarded(true)
        if (d.tpFromFund != null) setRewardSource({ fromFund: d.tpFromFund, fromCirc: d.tpFromCirculation ?? 0 })
        setCheckMsg({ ok: true, text: `✅ ${d.tpTotal ?? REWARD_TP} TP 지급 완료! (${saved.toLocaleString()}보)` })
      } else if (d.rewarded) {
        setRewarded(true); setCheckMsg({ ok: true, text: '✅ 이미 오늘 TP가 지급되었습니다.' })
      } else if (d.fundReason) {
        setCheckMsg({ ok: false, text: `❌ ${d.fundReason}` })
      } else if (saved < 10000) {
        setCheckMsg({ ok: false, text: `⚠️ ${saved.toLocaleString()}보 저장됨 — ${(10000 - saved).toLocaleString()}보 더 걸으면 TP 지급!` })
      } else {
        setCheckMsg({ ok: true, text: `✅ ${saved.toLocaleString()}보 저장 완료` })
      }
    } catch { setCheckMsg({ ok: false, text: '❌ 서버 연결에 실패했습니다. 다시 시도해 주세요.' }) }
    finally { setChecking(false) }
  }

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>

  const totalSteps = isNative ? nativeDisplaySteps : serverSteps + webSessionSteps
  const progress   = Math.min(totalSteps / GOAL, 1)
  const isActive   = isNative ? inWindow : webTracking

  return (
    <div className="max-w-sm mx-auto space-y-6 pb-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold">오늘의 만보기</h1>
        <p className="text-sm text-muted-foreground mt-1">
          매일 10,000보 달성 시 <span className="font-semibold text-blue-600">{REWARD_TP} TP</span> 적립
        </p>
      </div>

      <WalkCircleGauge totalSteps={totalSteps} progress={progress} rewarded={rewarded} isActive={isActive} goal={GOAL} />

      <div className={`rounded-xl px-4 py-3 border text-sm text-center font-medium ${isActive ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
        {saving ? '💾 저장 중...' : isActive ? '🚶 자동 측정 중 (00:01 ~ 23:59)' : '⏸ 자정(00:01) 이후 자동 시작됩니다'}
      </div>

      {isNative && isActive && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-700 text-center">
          📱 앱이 꺼져도 백그라운드에서 자동 측정됩니다<br />
          <span className="text-blue-500">알림 바의 "TimePay 만보기"가 실행 중임을 나타냅니다</span>
        </div>
      )}

      {!isNative && isActive && (
        <div className={`rounded-xl px-4 py-3 border text-xs ${sensorActive ? 'bg-green-50 border-green-200 text-green-800' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
          <div className="flex items-center gap-2 mb-1">
            {sensorActive ? <Activity className="h-4 w-4 text-green-600 shrink-0" /> : <Cpu className="h-4 w-4 text-gray-400 shrink-0 animate-pulse" />}
            {sensorActive
              ? <span className="font-semibold">✅ 센서 작동 중{sensorMode !== 'none' && <span className="ml-1 font-normal text-green-600">({SENSOR_LABEL[sensorMode]})</span>}</span>
              : <span>{sensorMode === 'none' ? '⏳ 센서 초기화 중…' : `⏳ 신호 대기 중 (${SENSOR_LABEL[sensorMode]})… 걸어보세요`}</span>
            }
          </div>
          {sensorActive && <p className="pl-6 text-green-700">가속도: <strong>{debugMag} m/s²</strong> · 수신: {eventCount}회 · 세션: {webSessionSteps}보</p>}
        </div>
      )}

      {justRewarded && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-2xl p-5 text-center space-y-2">
          <p className="text-4xl">🎉</p>
          <p className="font-bold text-yellow-800 text-xl">오늘 1만보 달성!</p>
          <p className="text-sm text-yellow-700">건강증진 기금에서 <strong className="text-green-700">{REWARD_TP} TP</strong> 적립!</p>
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

      <FundStatusCard status={fundStatus} />

      {permError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex gap-2 text-sm text-red-700">
          <CircleOff className="h-4 w-4 shrink-0 mt-0.5" /><span>{permError}</span>
        </div>
      )}

      {isAdmin && <DebugPanel serverSteps={serverSteps} webSessionSteps={webSessionSteps} isNative={isNative} sensorMode={sensorMode} sensorActive={sensorActive} saveStatus={saveStatus} />}

      <WalkCheckCard checking={checking} rewarded={rewarded} checkMsg={checkMsg} onCheck={handleCheckNow} />

      <div className="bg-blue-50 rounded-xl p-4 space-y-2">
        <p className="text-sm font-semibold text-blue-800">📱 이용 안내</p>
        <ul className="space-y-1 text-xs text-blue-700 list-disc list-inside">
          <li>매일 <strong>00시 01분</strong>에 자동으로 측정 시작</li>
          <li><strong>10,000보 도달 즉시</strong> TP 자동 지급</li>
          <li><strong>APK 설치 시</strong>: 앱을 닫아도 백그라운드에서 계속 측정</li>
          <li><strong>웹 브라우저</strong>: 화면이 열려 있어야 측정됨</li>
          <li>10,000보 달성 시 하루 1회 <strong>{REWARD_TP} TP</strong> 자동 적립</li>
        </ul>
      </div>
    </div>
  )
}
