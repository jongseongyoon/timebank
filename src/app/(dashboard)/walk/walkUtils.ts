export const GOAL      = 10000
export const REWARD_TP = 0.5

export const COOLDOWN_MS       = 280
export const STEP_DELTA_PURE   = 1.2
export const STEP_DELTA_GRAVITY = 2.0
export const EMA_ALPHA         = 0.005

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform: () => boolean
      Plugins: { StepCounter?: any }
    }
  }
}

export function isCapacitorNative(): boolean {
  return typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.()
}

export function getStepPlugin(): any | null {
  return window.Capacitor?.Plugins?.StepCounter ?? null
}

export function isTrackingHour(): boolean {
  // 기기 로컬 시간이 아닌 KST(UTC+9) 기준 — 해외 로밍·시간대 오설정 방어
  const kst = new Date(Date.now() + 9 * 3600_000)
  const h   = kst.getUTCHours()
  const m   = kst.getUTCMinutes()
  const afterStart = h > 0 || (h === 0 && m >= 1)   // KST 00:01 이후
  const beforeStop  = h < 23 || (h === 23 && m < 59) // KST 23:59 이전
  return afterStart && beforeStop
}
