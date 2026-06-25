'use client'
/**
 * 팔로업 대시보드 (명령서 §3.2.5)
 * 전체 인물의 미해결/기한임박 조치를 한 화면에. 트리아지 케이스관리·PDCA 후속관리.
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CalendarClock, AlertTriangle, ChevronRight } from 'lucide-react'
import { TriageBadge } from '@/components/monitoring/triage-badge'
import type { FollowupItem } from '@/lib/dementia/types'
import { cn } from '@/lib/utils'

interface FollowupResponse {
  items: FollowupItem[]
  counts: { total: number; overdue: number; soon: number }
  fetchedAt: string
  source: string
}

const DUE_LABEL: Record<FollowupItem['dueState'], { text: string; cls: string }> = {
  overdue: { text: '기한 지남', cls: 'bg-red-100 text-red-700' },
  soon: { text: '임박(7일내)', cls: 'bg-orange-100 text-orange-700' },
  later: { text: '여유', cls: 'bg-gray-100 text-gray-600' },
  none: { text: '기한 없음', cls: 'bg-gray-100 text-gray-500' },
}

export default function FollowupsPage() {
  const [data, setData] = useState<FollowupResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/monitoring/followups')
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? '조회 실패')
        setData(json)
      } catch (e) {
        setError(e instanceof Error ? e.message : '조회 실패')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold">팔로업 — 미해결 / 기한 임박</h1>
        <p className="text-xs text-muted-foreground">
          해결여부가 완료가 아닌 조치 모음 (공백·신규_요청·진행 포함)
        </p>
      </div>

      {data && (
        <div className="grid grid-cols-3 gap-2">
          <Stat label="전체 미해결" value={data.counts.total} cls="text-gray-900" />
          <Stat label="기한 지남" value={data.counts.overdue} cls="text-red-600" />
          <Stat label="7일내 임박" value={data.counts.soon} cls="text-orange-600" />
        </div>
      )}

      {loading && <p className="py-10 text-center text-sm text-muted-foreground">불러오는 중…</p>}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}
      {data && data.items.length === 0 && !loading && (
        <p className="py-10 text-center text-sm text-muted-foreground">미해결 조치가 없습니다. 👍</p>
      )}

      <ul className="space-y-2">
        {data?.items.map((item, i) => {
          const due = DUE_LABEL[item.dueState]
          return (
            <li key={`${item.personKey}-${i}`}>
              <Link
                href={`/monitoring/person/${encodeURIComponent(item.personKey)}`}
                className="block rounded-lg border bg-white p-3 shadow-sm transition-colors hover:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{item.maskedName}</span>
                    <TriageBadge triage={item.triage} />
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
                <p className="mt-1.5 text-sm font-semibold">
                  {item.code && <span className="mr-1 text-muted-foreground">[{item.code}]</span>}
                  {item.actionText}
                  {item.org && <span className="ml-1 text-muted-foreground">({item.org})</span>}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <span className={cn('rounded px-1.5 py-0.5 font-semibold', due.cls)}>
                    {item.dueState === 'overdue' && <AlertTriangle className="mr-0.5 inline h-3 w-3" />}
                    {due.text}
                  </span>
                  {item.dueDate && (
                    <span className="flex items-center gap-1 text-gray-600">
                      <CalendarClock className="h-3 w-3" /> {item.dueDate}
                    </span>
                  )}
                  <span className="text-muted-foreground">
                    해결여부: {item.status || '(공백)'}
                  </span>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>

      {data && (
        <p className="pt-2 text-center text-[11px] text-muted-foreground">
          출처: {data.source} · 갱신 {new Date(data.fetchedAt).toLocaleString('ko-KR')}
        </p>
      )}
    </div>
  )
}

function Stat({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <div className="rounded-lg border bg-white p-3 text-center shadow-sm">
      <div className={cn('text-2xl font-bold', cls)}>{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  )
}
