'use client'
/**
 * 인물 검색/목록 화면 (명령서 §3.1.2)
 * 마스킹된 사람 목록 + 검색(성명/코드/초성) + 정렬/트리아지 필터.
 */
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Search, AlertTriangle, RefreshCw, ChevronRight, Clock } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { TriageBadge } from '@/components/monitoring/triage-badge'
import type { RecordsResponse, PersonSummary } from '@/lib/dementia/types'

type SortKey = 'recent' | 'triage'

export default function MonitoringPeoplePage() {
  const [data, setData] = useState<RecordsResponse | null>(null)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('recent')
  const [minTriage, setMinTriage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (refresh = false) => {
      setLoading(true)
      setError(null)
      try {
        const qs = new URLSearchParams()
        if (search) qs.set('search', search)
        qs.set('sort', sort)
        if (minTriage) qs.set('triage', String(minTriage))
        if (refresh) qs.set('refresh', '1')
        const res = await fetch(`/api/monitoring/records?${qs}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? '조회 실패')
        setData(json)
      } catch (e) {
        setError(e instanceof Error ? e.message : '조회 실패')
      } finally {
        setLoading(false)
      }
    },
    [search, sort, minTriage],
  )

  // 검색어 디바운스
  useEffect(() => {
    const t = setTimeout(() => load(), 300)
    return () => clearTimeout(t)
  }, [load])

  return (
    <div className="space-y-4">
      {/* 검색창 (상단 고정) */}
      <div className="sticky top-[97px] z-20 -mx-4 bg-gray-50 px-4 pb-2 pt-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="성명 · 생년월일코드 · 초성(ㅇㅅㄱ)으로 검색"
            className="pl-9 text-base"
            inputMode="text"
          />
        </div>
        <div className="mt-2 flex items-center gap-2 overflow-x-auto text-sm">
          <FilterChip active={sort === 'recent'} onClick={() => setSort('recent')}>
            최근 상담순
          </FilterChip>
          <FilterChip active={sort === 'triage'} onClick={() => setSort('triage')}>
            고위험 우선
          </FilterChip>
          <span className="mx-1 h-4 w-px bg-gray-300" />
          {[0, 1, 2, 3].map((t) => (
            <FilterChip key={t} active={minTriage === t} onClick={() => setMinTriage(t)}>
              {t === 0 ? '전체' : `트리아지 ${t}+`}
            </FilterChip>
          ))}
        </div>
      </div>

      {/* 출처 / 갱신 시각 */}
      {data && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="truncate">출처: {data.source} · 총 {data.total}명</span>
          <button
            onClick={() => load(true)}
            className="flex shrink-0 items-center gap-1 hover:text-foreground"
          >
            <Clock className="h-3 w-3" />
            {new Date(data.fetchedAt).toLocaleString('ko-KR')}
            <RefreshCw className="ml-1 h-3 w-3" />
          </button>
        </div>
      )}

      {/* 데이터 품질 경고 (명령서 §3.2.7) */}
      {data?.warnings.length ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <div className="mb-1 flex items-center gap-1 font-semibold">
            <AlertTriangle className="h-3.5 w-3.5" /> 데이터 품질 경고
          </div>
          <ul className="list-disc space-y-0.5 pl-4">
            {data.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
          <p className="mt-1 text-xs text-red-500">
            서버 환경변수(GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY / SHEET_GID)와
            시트 공유 권한을 확인하세요.
          </p>
        </div>
      )}

      {loading && !data && <p className="py-10 text-center text-sm text-muted-foreground">불러오는 중…</p>}

      {data && data.people.length === 0 && !loading && (
        <p className="py-10 text-center text-sm text-muted-foreground">조회 결과가 없습니다.</p>
      )}

      {/* 인물 목록 */}
      <ul className="space-y-2">
        {data?.people.map((p) => (
          <PersonCard key={p.personKey} person={p} />
        ))}
      </ul>
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? 'border-teal-600 bg-teal-600 text-white'
          : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  )
}

function PersonCard({ person }: { person: PersonSummary }) {
  return (
    <li>
      <Link
        href={`/monitoring/person/${encodeURIComponent(person.personKey)}`}
        className="flex items-center justify-between rounded-lg border bg-white p-4 shadow-sm transition-colors hover:bg-gray-50"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold">
              {person.maskedName}
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                {person.maskedBirthCode}
              </span>
            </span>
            <TriageBadge triage={person.maxTriage} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span>최근 {person.lastConsultedAt}</span>
            <span>· 회차 {person.visitCount}건</span>
            {person.openActionCount > 0 && (
              <span className="font-semibold text-orange-600">
                · 미해결 조치 {person.openActionCount}건
              </span>
            )}
            {person.hasParseWarning && (
              <span className="text-amber-600">· 파싱경고</span>
            )}
          </div>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" />
      </Link>
    </li>
  )
}
