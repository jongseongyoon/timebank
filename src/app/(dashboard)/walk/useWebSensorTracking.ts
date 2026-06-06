import { useEffect, useRef, useState, useCallback } from 'react'
import { COOLDOWN_MS, STEP_DELTA_PURE, STEP_DELTA_GRAVITY, EMA_ALPHA, isTrackingHour } from './walkUtils'

export function useWebSensorTracking(enabled: boolean, onStep: () => void) {
  const [sensorMode,  setSensorMode]  = useState<'none' | 'generic' | 'devicemotion'>('none')
  const [sensorActive, setSensorActive] = useState(false)
  const [debugMag,    setDebugMag]    = useState(0)
  const [eventCount,  setEventCount]  = useState(0)
  const [tracking,    setTracking]    = useState(false)
  const [permError,   setPermError]   = useState('')

  const lastMagRef       = useRef(0)
  const risingRef        = useRef(false)
  const lastStepTimeRef  = useRef(0)
  const motionHandlerRef = useRef<((e: DeviceMotionEvent) => void) | null>(null)
  const sensorRef        = useRef<any>(null)
  const eventCountRef    = useRef(0)
  const baselineRef      = useRef(9.81)
  const baselineInitRef  = useRef(false)
  const trackingRef      = useRef(false)

  function processMag(mag: number, stepDelta: number) {
    eventCountRef.current += 1
    if (eventCountRef.current % 10 === 0) {
      setSensorActive(true)
      setDebugMag(Math.round(mag * 10) / 10)
      setEventCount(eventCountRef.current)
    }
    if (!baselineInitRef.current) { baselineRef.current = mag; baselineInitRef.current = true }
    baselineRef.current = EMA_ALPHA * mag + (1 - EMA_ALPHA) * baselineRef.current
    if (mag > lastMagRef.current) {
      risingRef.current = true
    } else if (risingRef.current) {
      if (lastMagRef.current > baselineRef.current + stepDelta) {
        const now = Date.now()
        if (now - lastStepTimeRef.current > COOLDOWN_MS) { onStep(); lastStepTimeRef.current = now }
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
      sensor.addEventListener('error', () => { sensor.stop(); sensorRef.current = null; tryDeviceMotion() })
      sensor.addEventListener('reading', () => {
        const x: number = sensor.x ?? 0, y: number = sensor.y ?? 0, z: number = sensor.z ?? 0
        processMag(Math.sqrt(x * x + y * y + z * z), STEP_DELTA_PURE)
      })
      sensor.start(); sensorRef.current = sensor; setSensorMode('generic'); return true
    } catch { return false }
  }

  function tryDeviceMotion() {
    function handler(e: DeviceMotionEvent) {
      const purAcc   = e.acceleration
      const purValid = purAcc !== null && purAcc !== undefined && purAcc.x !== null && purAcc.y !== null && purAcc.z !== null
      const gravAcc  = e.accelerationIncludingGravity
      const gravValid = gravAcc !== null && gravAcc !== undefined && gravAcc.x !== null && gravAcc.y !== null && gravAcc.z !== null
      if (!purValid && !gravValid) return
      let mag: number, stepDelta: number
      if (purValid) {
        const ax = purAcc!.x!, ay = purAcc!.y!, az = purAcc!.z ?? 0
        mag = Math.sqrt(ax * ax + ay * ay + az * az); stepDelta = STEP_DELTA_PURE
      } else {
        const ax = gravAcc!.x!, ay = gravAcc!.y!, az = gravAcc!.z!
        mag = Math.sqrt(ax * ax + ay * ay + az * az); stepDelta = STEP_DELTA_GRAVITY
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
    setSensorMode('none'); setSensorActive(false); trackingRef.current = false; setTracking(false)
  }

  const startSensors = useCallback(async () => {
    if (trackingRef.current) return
    if (typeof DeviceMotionEvent !== 'undefined' && typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const result = await (DeviceMotionEvent as any).requestPermission()
        if (result !== 'granted') { setPermError('동작 센서 권한이 필요합니다. iOS 설정 > Safari > 모션 및 방향을 허용해 주세요.'); return }
      } catch { setPermError('센서 권한 요청에 실패했습니다.'); return }
    }
    setPermError(''); setSensorActive(false); setSensorMode('none'); setEventCount(0)
    eventCountRef.current = 0; baselineInitRef.current = false; baselineRef.current = 9.81
    lastMagRef.current = 0; risingRef.current = false; trackingRef.current = true; setTracking(true)
    const genericOk = await tryGenericSensor()
    if (!genericOk) tryDeviceMotion()
  }, [])

  useEffect(() => {
    if (!enabled) return
    function checkTime() {
      if (isTrackingHour()) { if (!trackingRef.current) startSensors() }
      else { if (trackingRef.current) stopSensors() }
    }
    checkTime()
    const timer = setInterval(checkTime, 30_000)
    return () => { clearInterval(timer); stopSensors() }
  }, [enabled, startSensors])

  return { tracking, sensorMode, sensorActive, debugMag, eventCount, permError }
}
