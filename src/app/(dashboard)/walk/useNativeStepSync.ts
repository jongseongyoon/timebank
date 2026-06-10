import { useEffect, useRef, useState } from 'react'
import { isCapacitorNative, getStepPlugin, isTrackingHour } from './walkUtils'
import { kstToday } from '@/lib/kst'

export interface SyncedInfo {
  steps: number; rewarded: boolean; rewardedNow: boolean
  tpFromFund?: number; tpFromCirc?: number
}
export interface SaveStatus {
  steps: number; ok: boolean; at: string; error?: string
}

// 서버가 500 등으로 빈 본문을 반환해도 예외 없이 처리
async function safeJson(res: Response): Promise<any> {
  const text = await res.text()
  try { return JSON.parse(text) } catch { return { error: text.slice(0, 120) || `HTTP ${res.status}` } }
}

export function useNativeStepSync(
  serverSteps:    number,
  serverRewarded: boolean,
  onSynced:       (info: SyncedInfo) => void,
  onSaveStatus:   (s: SaveStatus) => void,
) {
  const [nativeSteps, setNativeSteps] = useState(serverSteps)
  const [inWindow,    setInWindow]    = useState(isTrackingHour())
  const serverStepsRef    = useRef(serverSteps)
  const serverRewardedRef = useRef(serverRewarded)
  const lastSavedRef      = useRef(-1)
  const pollCountRef      = useRef(0)

  useEffect(() => { serverStepsRef.current    = serverSteps    }, [serverSteps])
  useEffect(() => { serverRewardedRef.current = serverRewarded }, [serverRewarded])

  useEffect(() => {
    if (!isCapacitorNative()) return
    const plugin = getStepPlugin()
    if (!plugin) return

    function reportSave(steps: number, ok: boolean, error?: string) {
      onSaveStatus({ steps, ok, at: new Date().toLocaleTimeString('ko-KR'), error })
    }

    async function syncPending() {
      try {
        const { pending, steps, date } = await plugin.getPendingSave()
        if (!pending || steps <= 0) return
        const today    = kstToday()
        const diffDays = Math.floor((new Date(today).getTime() - new Date(date).getTime()) / 86400000)
        if (diffDays < 0 || diffDays > 1) return
        const res = await fetch('/api/walk/steps', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ steps, date }),
        })
        const d = await safeJson(res)
        if (res.ok) {
          lastSavedRef.current = d.steps
          reportSave(d.steps, true)
          onSynced({ steps: d.steps, rewarded: d.rewarded, rewardedNow: !!d.rewardedNow, tpFromFund: d.tpFromFund, tpFromCirc: d.tpFromCirculation })
          await plugin.markSaved()
        } else {
          reportSave(steps, false, `pending sync ${res.status}: ${d.error ?? ''}`)
        }
      } catch (e: any) { reportSave(0, false, `pending sync 예외: ${e.message ?? e}`) }
    }
    syncPending()

    async function saveStepsOnly(steps: number) {
      try {
        const res = await fetch('/api/walk/record', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ steps }),
        })
        const d = await safeJson(res)
        if (res.ok) {
          lastSavedRef.current = d.steps ?? steps
          reportSave(d.steps ?? steps, true)
          // /api/walk/record도 1만보 도달 시 즉시 지급하므로 결과 반영
          if (d.rewardedNow) onSynced({ steps: d.steps ?? steps, rewarded: true, rewardedNow: true, tpFromFund: d.tpFromFund, tpFromCirc: d.tpFromCirculation })
        }
        else reportSave(steps, false, `record ${res.status}: ${d.error ?? ''}`)
      } catch (e: any) { reportSave(steps, false, `record 예외: ${e.message ?? e}`) }
    }

    async function saveStepsAndAward(steps: number) {
      try {
        const res = await fetch('/api/walk/steps', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ steps }),
        })
        const d = await safeJson(res)
        if (res.ok) {
          lastSavedRef.current = d.steps ?? steps
          reportSave(d.steps ?? steps, true)
          onSynced({ steps: d.steps ?? steps, rewarded: d.rewarded, rewardedNow: !!d.rewardedNow, tpFromFund: d.tpFromFund, tpFromCirc: d.tpFromCirculation })
        } else { reportSave(steps, false, `steps ${res.status}: ${d.error ?? ''}`) }
      } catch (e: any) { reportSave(steps, false, `steps 예외: ${e.message ?? e}`) }
    }

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
            await saveStepsAndAward(nSteps)
          } else {
            const bigChange    = prevSaved >= 0 && nSteps - prevSaved >= 500
            const periodicSave = pollCountRef.current % 60 === 0
            if (prevSaved < 0 || bigChange || periodicSave) await saveStepsOnly(nSteps)
          }
        }
      } catch (e: any) { reportSave(0, false, `getTodaySteps 예외: ${(e as any).message ?? e}`) }
      setInWindow(isTrackingHour())
    }
    poll()
    const timer = setInterval(poll, 5000)
    return () => clearInterval(timer)
  }, [])

  const displaySteps = Math.max(serverSteps, nativeSteps)
  return { displaySteps, inWindow }
}
