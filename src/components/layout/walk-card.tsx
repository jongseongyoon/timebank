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

const GOAL = 10000

interface Props {
  serverSteps: number
  rewarded: boolean
}

export function WalkCard({ serverSteps, rewarded: serverRewarded }: Props) {
  const [steps,    setSteps]    = useState(serverSteps)
  const [rewarded, setRewarded] = useState(serverRewarded)
  const savedOnceRef = useRef(false)

  useEffect(() => {
    if (!isCapacitorNative()) return
    const plugin = window.Capacitor?.Plugins?.StepCounter
    if (!plugin) return

    async function load() {
      try {
        // ① 네이티브에서 오늘 걸음수 읽기
        const { steps: nativeSteps } = await plugin.getTodaySteps()
        const ns = typeof nativeSteps === 'number' ? nativeSteps : 0

        if (ns > 0) {
          // 화면에 즉시 표시 (서버 저장값보다 크면 네이티브값 우선)
          const display = Math.max(serverSteps, ns)
          setSteps(display)

          // ② 서버에 저장 (최초 1회 — WalkRecord가 없을 때 채워주는 용도)
          if (!savedOnceRef.current) {
            savedOnceRef.current = true
            const res = await fetch('/api/walk/record', {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body:    JSON.stringify({ steps: ns }),
            })
            if (res.ok) {
              const d = await res.json()
              // 서버에 최종 저장된 값(최댓값)으로 화면 갱신
              setSteps(d.steps ?? display)
              setRewarded(d.rewarded ?? serverRewarded)
            }
          }
        }

        // ③ pending_save 동기화 (백그라운드 서비스가 저장한 값)
        const { pending, steps: pendingSteps, date } = await plugin.getPendingSave()
        if (pending && pendingSteps > 0) {
          const today    = new Date().toISOString().slice(0, 10)
          const diffDays = Math.floor((new Date(today).getTime() - new Date(date).getTime()) / 86400000)
          if (diffDays >= 0 && diffDays <= 1) {
            const res = await fetch('/api/walk/steps', {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body:    JSON.stringify({ steps: pendingSteps, date }),
            })
            if (res.ok) {
              const d = await res.json()
              setSteps(d.steps)
              setRewarded(d.rewarded)
              await plugin.markSaved()
            }
          }
        }
      } catch {}
    }

    load()

    // 30초마다 갱신 (화면 표시 + 저장)
    const timer = setInterval(async () => {
      try {
        const { steps: ns } = await plugin.getTodaySteps()
        const nSteps = typeof ns === 'number' ? ns : 0
        if (nSteps > 0) {
          setSteps(prev => Math.max(prev, nSteps))
          // 서버에도 저장 (변화 없으면 API가 DB 쓰기 생략)
          await fetch('/api/walk/record', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ steps: nSteps }),
          })
        }
      } catch {}
    }, 30_000)

    return () => clearInterval(timer)
  }, [serverSteps, serverRewarded])

  const progress = Math.min(steps / GOAL, 1)
  const achieved = steps >= GOAL

  return (
    <Link href="/walk">
      <Card className="bg-gradient-to-r from-emerald-500 to-green-600 text-white border-0 hover:opacity-95 transition-opacity cursor-pointer">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Footprints className="h-8 w-8 text-green-100" />
              <div>
                <p className="text-green-100 text-xs">오늘의 만보기</p>
                <p className="text-2xl font-bold tabular-nums">
                  {steps.toLocaleString()}
                  {/* 목표 달성 시: "보 ✅" / 미달성 시: "/ 10,000보" */}
                  {achieved
                    ? <span className="text-sm font-normal text-green-200 ml-1">보 ✅</span>
                    : <span className="text-sm font-normal text-green-200 ml-1">/ {GOAL.toLocaleString()}보</span>
                  }
                </p>
                {rewarded
                  ? <p className="text-xs text-green-200 mt-0.5">0.5 TP 적립 완료</p>
                  : achieved
                    ? <p className="text-xs text-yellow-200 mt-0.5">🎯 목표 달성! TP 지급 대기</p>
                    : null
                }
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
          <p className="text-right text-xs text-green-200 mt-1">
            {achieved ? '🏆 목표 달성!' : `${Math.round(progress * 100)}%`}
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}
