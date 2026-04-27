'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Footprints, ChevronRight } from 'lucide-react'

declare global {
  interface Window {
    Capacitor?: { isNativePlatform: () => boolean; Plugins: { StepCounter?: any } }
  }
}

function isCapacitorNative() {
  return typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.()
}

interface Props {
  serverSteps: number
  rewarded: boolean
}

export function WalkCard({ serverSteps, rewarded: serverRewarded }: Props) {
  const [steps, setSteps] = useState(serverSteps)
  const [rewarded, setRewarded] = useState(serverRewarded)
  const syncedRef = useRef(false)

  useEffect(() => {
    if (!isCapacitorNative()) return
    const plugin = window.Capacitor?.Plugins?.StepCounter
    if (!plugin) return

    async function load() {
      try {
        // 네이티브 SharedPreferences에서 오늘 걸음 수 읽기
        const { steps: nativeSteps } = await plugin.getTodaySteps()
        if (typeof nativeSteps === 'number' && nativeSteps > 0) {
          setSteps(Math.max(serverSteps, nativeSteps))
        }

        // pending_save 동기화 (한 번만)
        if (!syncedRef.current) {
          syncedRef.current = true
          const { pending, steps: pendingSteps, date } = await plugin.getPendingSave()
          if (pending && pendingSteps > 0) {
            const today = new Date().toISOString().slice(0, 10)
            if (date === today) {
              const res = await fetch('/api/walk/steps', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ steps: pendingSteps }),
              })
              if (res.ok) {
                const d = await res.json()
                setSteps(d.steps)
                setRewarded(d.rewarded)
                await plugin.markSaved()
              }
            }
          }
        }
      } catch {}
    }

    load()
    // 30초마다 갱신
    const timer = setInterval(async () => {
      try {
        const { steps: nativeSteps } = await plugin.getTodaySteps()
        if (typeof nativeSteps === 'number') setSteps(Math.max(serverSteps, nativeSteps))
      } catch {}
    }, 30_000)
    return () => clearInterval(timer)
  }, [serverSteps])

  const progress = Math.min(steps / 10000, 1)

  return (
    <Link href="/walk">
      <Card className="bg-gradient-to-r from-emerald-500 to-green-600 text-white border-0 hover:opacity-95 transition-opacity cursor-pointer">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Footprints className="h-8 w-8 text-green-100" />
              <div>
                <p className="text-green-100 text-xs">오늘의 만보기</p>
                <p className="text-2xl font-bold">
                  {steps.toLocaleString()}
                  <span className="text-sm font-normal text-green-200 ml-1">/ 10,000보</span>
                </p>
                {rewarded && (
                  <p className="text-xs text-green-200 mt-0.5">✅ 0.5 TP 적립 완료</p>
                )}
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-green-200" />
          </div>
          <div className="mt-3 bg-green-400/30 rounded-full h-2">
            <div
              className="bg-white rounded-full h-2 transition-all"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
