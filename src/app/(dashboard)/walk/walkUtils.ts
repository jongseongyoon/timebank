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
  const h = new Date().getHours()
  const m = new Date().getMinutes()
  const afterStart = h > 0 || (h === 0 && m >= 1)
  const beforeStop  = h < 23 || (h === 23 && m < 59)
  return afterStart && beforeStop
}
