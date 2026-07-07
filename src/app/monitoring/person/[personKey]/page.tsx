'use client'
/**
 * 인물 상세 = 목표 화면(gid 1496494699 재현) — 명령서 §3.1.3
 * 상단: 선택한 성명생년월일(권한자에게 전체 노출, 스크롤 중 고정)
 * 구성(핵심 우선): 사례회의 조치 → 방문 이력(아코디언) → 기본정보 → 통합돌봄서비스
 */
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, CalendarDays, HeartHandshake, ListChecks, IdCard,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import { TriageBadge } from '@/components/monitoring/triage-badge'
import { RecordBody, ActionItemRow } from '@/components/monitoring/record-view'
import type { VisitRecord, ActionItem, RosterField, CareService } from '@/lib/dementia/types'

interface PersonDetail {
  personKey: string
  name: string
  birthCode: string
  visitCount: number
  maxTriage: number
  roster: RosterField[]
  care: CareService[]
  visits: VisitRecord[]
  actions: ActionItem[]
  fetchedAt: string
  source: string
}

/** 통일된 요약 카드 (아이콘 + 제목 + 옵션 배지) */
function Section({
  icon: Icon,
  title,
  badge,
  children,
}: {
  icon: typeof IdCard
  title: string
  badge?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="mb-2.5 flex items-center gap-1.5">
        <Icon className="h-4 w-4 text-teal-600" aria-hidden="true" />
        <h2 className="text-sm font-bold text-teal-800">{title}</h2>
        {badge}
      </div>
      {children}
    </section>
  )
}

export default function PersonDetailPage() {
  const params = useParams<{ personKey: string }>()
  const personKey = decodeURIComponent(params.personKey)
  const [data, setData] = useState<PersonDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [openVisits, setOpenVisits] = useState<Set<number>>(new Set())

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/monitoring/person/${encodeURIComponent(personKey)}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? '조회 실패')
        setData(json)
        // 최신 회차만 펼쳐 두기(이전은 접힘)
        setOpenVisits(new Set(json.visits.slice(0, 1).map((v: VisitRecord) => v.rowIndex)))
      } catch (e) {
        setError(e instanceof Error ? e.message : '조회 실패')
      } finally {
        setLoading(false)
      }
    })()
  }, [personKey])

  const toggleVisit = (rowIndex: number) =>
    setOpenVisits((prev) => {
      const next = new Set(prev)
      next.has(rowIndex) ? next.delete(rowIndex) : next.add(rowIndex)
      return next
    })

  const openCount = data?.actions.filter((a) => !a.resolved).length ?? 0

  return (
    <div className="space-y-3">
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
          {/* 인물 헤더 (스크롤 중 상단 고정) */}
          <div className="sticky top-[88px] z-10 -mx-4 border-b border-gray-200 bg-gray-50/95 px-4 py-2 backdrop-blur">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-lg font-bold">{data.name}</span>
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {data.birthCode}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-muted-foreground">방문 {data.visitCount}회</span>
                <TriageBadge triage={data.maxTriage} />
              </div>
            </div>
          </div>

          {/* 1) 사례회의 조치 — 실무 우선 */}
          {data.actions.length > 0 && (
            <Section
              icon={ListChecks}
              title="사례회의 조치"
              badge={
                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
                  미해결 {openCount} / 전체 {data.actions.length}
                </span>
              }
            >
              <div className="space-y-1.5">
                {data.actions.map((a, i) => (
                  <ActionItemRow key={i} action={a} />
                ))}
              </div>
            </Section>
          )}

          {/* 2) 방문 이력 — 최신만 펼치고 이전은 접기(아코디언) */}
          <Section
            icon={CalendarDays}
            title="방문 이력"
            badge={<span className="text-[11px] text-muted-foreground">{data.visits.length}회</span>}
          >
            <ol className="space-y-2">
              {data.visits.map((v) => {
                const open = openVisits.has(v.rowIndex)
                return (
                  <li key={v.rowIndex} className="overflow-hidden rounded-md border border-gray-200">
                    <button
                      onClick={() => toggleVisit(v.rowIndex)}
                      className="flex w-full items-center justify-between gap-2 bg-gray-50 px-3 py-2.5 text-left hover:bg-gray-100"
                      aria-expanded={open}
                    >
                      <span className="flex items-center gap-1.5 text-sm font-semibold">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        {v.consultedAt}
                      </span>
                      <span className="flex items-center gap-2">
                        <TriageBadge triage={v.triage} />
                        {open ? (
                          <ChevronUp className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                      </span>
                    </button>
                    {open && (
                      <div className="border-t border-gray-100 px-3 py-3">
                        {v.parseWarning && (
                          <p className="mb-2 text-xs text-amber-600">⚠ {v.parseWarning}</p>
                        )}
                        {v.record ? (
                          <RecordBody record={v.record} actions={v.actions} />
                        ) : (
                          <p className="text-sm text-muted-foreground">(등록서식 내용 없음)</p>
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
            </ol>
          </Section>

          {/* 3) 기본정보 (명단 — 참조) */}
          {data.roster.length > 0 && (
            <Section icon={IdCard} title="기본정보">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                {data.roster.map((f, i) => (
                  <div key={i} className="min-w-0">
                    <dt className="text-[11px] text-muted-foreground">{f.label}</dt>
                    <dd className="truncate text-sm font-semibold" title={f.value}>
                      {f.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </Section>
          )}

          {/* 4) 통합돌봄서비스 (참조) */}
          {data.care.length > 0 && (
            <Section
              icon={HeartHandshake}
              title="통합돌봄서비스"
              badge={<span className="text-[11px] text-muted-foreground">{data.care.length}건</span>}
            >
              <ul className="divide-y divide-gray-100">
                {data.care.map((c, i) => (
                  <li key={i} className="flex items-baseline gap-2 py-1">
                    <span className="min-w-[64px] shrink-0 text-xs font-semibold text-teal-700">
                      {c.service || '서비스'}
                    </span>
                    <span className="min-w-0 flex-1 break-words text-xs text-gray-500">{c.org}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <p className="pt-1 text-center text-[11px] text-muted-foreground">
            출처: {data.source} · 갱신 {new Date(data.fetchedAt).toLocaleString('ko-KR')}
          </p>
        </>
      )}
    </div>
  )
}
