'use client'
/**
 * 인물 상세 = 목표 화면(gid 1496494699 재현) — 명령서 §3.1.3
 * 상단: 선택한 성명생년월일(권한자에게 전체 노출)
 * 본문: 방문 이력 리스트(최신순). 각 회차 = 상담일시 · 트리아지 · 등록서식.
 */
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CalendarDays } from 'lucide-react'
import { TriageBadge } from '@/components/monitoring/triage-badge'
import { RecordBody, ActionItemRow } from '@/components/monitoring/record-view'
import type { VisitRecord, ActionItem } from '@/lib/dementia/types'

interface PersonDetail {
  personKey: string
  name: string
  birthCode: string
  visitCount: number
  maxTriage: number
  visits: VisitRecord[]
  actions: ActionItem[]
  fetchedAt: string
  source: string
}

export default function PersonDetailPage() {
  const params = useParams<{ personKey: string }>()
  const personKey = decodeURIComponent(params.personKey)
  const [data, setData] = useState<PersonDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/monitoring/person/${encodeURIComponent(personKey)}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? '조회 실패')
        setData(json)
      } catch (e) {
        setError(e instanceof Error ? e.message : '조회 실패')
      } finally {
        setLoading(false)
      }
    })()
  }, [personKey])

  return (
    <div className="space-y-4">
      <Link
        href="/monitoring"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> 인물 목록
      </Link>

      {loading && <p className="py-10 text-center text-sm text-muted-foreground">불러오는 중…</p>}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {data && (
        <>
          {/* 상단 인물 헤더 (전체 노출 — 상세 전용) */}
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold">
                  {data.name}
                  <span className="ml-2 text-base font-normal text-muted-foreground">
                    {data.birthCode}
                  </span>
                </h1>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  방문 이력 {data.visitCount}회 · 최고 트리아지
                </p>
              </div>
              <TriageBadge triage={data.maxTriage} className="text-sm" />
            </div>
          </div>

          {/* 사례회의 조치 (인물 단위) */}
          {data.actions.length > 0 && (
            <div className="rounded-lg border bg-white p-4 shadow-sm">
              <h2 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-teal-800">
                사례회의 조치
                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
                  미해결 {data.actions.filter((a) => !a.resolved).length} / 전체 {data.actions.length}
                </span>
              </h2>
              <div className="space-y-1.5">
                {data.actions.map((a, i) => (
                  <ActionItemRow key={i} action={a} />
                ))}
              </div>
            </div>
          )}

          {/* 방문 이력 리스트 (최신순) */}
          <ol className="space-y-3">
            {data.visits.map((v) => (
              <li key={v.rowIndex} className="rounded-lg border bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between border-b pb-2">
                  <span className="flex items-center gap-1.5 text-sm font-semibold">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    {v.consultedAt}
                  </span>
                  <TriageBadge triage={v.triage} />
                </div>
                {v.parseWarning && (
                  <p className="mb-2 text-xs text-amber-600">⚠ {v.parseWarning}</p>
                )}
                {v.record ? (
                  <RecordBody record={v.record} actions={v.actions} />
                ) : (
                  <p className="text-sm text-muted-foreground">(등록서식 내용 없음)</p>
                )}
              </li>
            ))}
          </ol>

          <p className="pt-2 text-center text-[11px] text-muted-foreground">
            출처: {data.source} · 갱신 {new Date(data.fetchedAt).toLocaleString('ko-KR')}
          </p>
        </>
      )}
    </div>
  )
}
