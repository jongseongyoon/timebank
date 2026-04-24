'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Search, MapPin, Clock, Coins, CalendarDays, User, Building2 } from 'lucide-react'

const CATEGORIES = [
  { value: '', label: '전체' },
  { value: 'TRANSPORT', label: '🚗 이동지원' },
  { value: 'SHOPPING', label: '🛒 장보기' },
  { value: 'COMPANION', label: '💬 말벗' },
  { value: 'MEAL', label: '🍱 식사지원' },
  { value: 'HOUSEKEEPING', label: '🏠 가사지원' },
  { value: 'MEDICAL_ESCORT', label: '🏥 의료동행' },
  { value: 'EDUCATION', label: '📚 교육' },
  { value: 'DIGITAL_HELP', label: '📱 디지털지원' },
  { value: 'REPAIR', label: '🔧 수리' },
  { value: 'CHILDCARE', label: '👶 아이돌봄' },
  { value: 'LEGAL_CONSULT', label: '⚖️ 법률상담' },
  { value: 'HEALTH_CONSULT', label: '💊 건강상담' },
  { value: 'ADMINISTRATIVE', label: '📋 행정보조' },
  { value: 'COMMUNITY_EVENT', label: '🎉 공동체행사' },
  { value: 'OTHER', label: '✨ 기타' },
]

const DONGS = [
  '', '양동', '양3동', '농성1동', '농성2동', '광천동', '유덕동',
  '치평동', '상무1동', '상무2동', '화정1동', '화정2동',
  '화정3동', '화정4동', '서창동', '금호1동', '금호2동', '풍암동', '동천동',
]

const DAY_LABEL: Record<string, string> = {
  MON: '월', TUE: '화', WED: '수', THU: '목', FRI: '금', SAT: '토', SUN: '일',
}

const CAT_LABEL: Record<string, string> = {
  TRANSPORT: '🚗 이동지원', SHOPPING: '🛒 장보기', COMPANION: '💬 말벗',
  MEAL: '🍱 식사지원', HOUSEKEEPING: '🏠 가사지원', MEDICAL_ESCORT: '🏥 의료동행',
  EDUCATION: '📚 교육', DIGITAL_HELP: '📱 디지털지원', REPAIR: '🔧 수리',
  CHILDCARE: '👶 아이돌봄', LEGAL_CONSULT: '⚖️ 법률상담', HEALTH_CONSULT: '💊 건강상담',
  ADMINISTRATIVE: '📋 행정보조', COMMUNITY_EVENT: '🎉 공동체행사', OTHER: '✨ 기타',
}

export default function ServiceBrowsePage() {
  const [listings, setListings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [catFilter, setCatFilter] = useState('')
  const [dongFilter, setDongFilter] = useState('')
  const [search, setSearch] = useState('')
  const [orgOnly, setOrgOnly] = useState(false)

  // 신청 모달
  const [selected, setSelected] = useState<any>(null)
  const [applyForm, setApplyForm] = useState({ requestedDate: '', durationMinutes: 60, description: '' })
  const [applying, setApplying] = useState(false)
  const [applyDone, setApplyDone] = useState(false)
  const [applyError, setApplyError] = useState('')

  useEffect(() => {
    const params = new URLSearchParams()
    if (catFilter) params.set('category', catFilter)
    if (dongFilter) params.set('dong', dongFilter)
    if (orgOnly) params.set('orgOnly', 'true')
    setLoading(true)
    fetch(`/api/services?${params}`)
      .then(r => r.json())
      .then(d => { setListings(d.listings ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [catFilter, dongFilter, orgOnly])

  const filtered = listings.filter(l =>
    !search || l.title.includes(search) || l.description?.includes(search) ||
    l.provider?.name.includes(search) || l.organization?.name.includes(search)
  )

  async function handleApply() {
    if (!selected) return
    setApplying(true)
    setApplyError('')
    const res = await fetch('/api/services/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: selected.category,
        description: applyForm.description || `${CAT_LABEL[selected.category]} 서비스 신청 (${selected.title})`,
        requestedDate: new Date(applyForm.requestedDate).toISOString(),
        durationMinutes: applyForm.durationMinutes,
        dong: selected.availableDong[0],
        urgency: 'NORMAL',
      }),
    })
    if (res.ok) {
      setApplyDone(true)
    } else {
      const d = await res.json()
      setApplyError(d.error ?? '신청 중 오류가 발생했습니다.')
    }
    setApplying(false)
  }

  function openModal(listing: any) {
    setSelected(listing)
    setApplyForm({ requestedDate: '', durationMinutes: 60, description: '' })
    setApplyDone(false)
    setApplyError('')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">서비스 찾기</h1>
        <p className="text-sm text-muted-foreground mt-1">이웃이 제공하는 서비스를 찾아 신청하세요</p>
      </div>

      {/* 필터 */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        {/* 검색 */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="서비스명, 제공자/단체 검색"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {/* 카테고리 */}
        <select
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
          className="h-10 px-3 rounded-md border border-input bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label || '전체 카테고리'}</option>)}
        </select>
        {/* 동 필터 */}
        <select
          value={dongFilter}
          onChange={e => setDongFilter(e.target.value)}
          className="h-10 px-3 rounded-md border border-input bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {DONGS.map(d => <option key={d} value={d}>{d || '전체 지역'}</option>)}
        </select>
        {/* 단체 서비스만 */}
        <button
          type="button"
          onClick={() => setOrgOnly(v => !v)}
          className={`flex items-center gap-1.5 h-10 px-3 rounded-md border text-sm font-medium transition-colors ${orgOnly ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-input hover:border-primary'}`}
        >
          <Building2 className="h-4 w-4" />
          단체 서비스만
        </button>
      </div>

      {/* 결과 수 */}
      {!loading && (
        <p className="text-sm text-muted-foreground">
          {filtered.length}개의 서비스
        </p>
      )}

      {/* 목록 */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          불러오는 중…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p>조건에 맞는 서비스가 없습니다.</p>
          <p className="text-xs mt-1">필터를 변경하거나 서비스 등록을 먼저 해보세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(listing => (
            <Card key={listing.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openModal(listing)}>
              <CardContent className="pt-5 pb-4 space-y-3">
                {/* 카테고리 + TC */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap gap-1">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                      {CAT_LABEL[listing.category] ?? listing.category}
                    </span>
                    {listing.organization && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                        🏢 단체
                      </span>
                    )}
                  </div>
                  <span className="flex items-center gap-1 text-sm font-bold text-amber-600 shrink-0">
                    <Coins className="h-3.5 w-3.5" />
                    {Number(listing.tcPerHour).toFixed(1)} TC/h
                  </span>
                </div>

                {/* 제목 */}
                <h3 className="font-semibold text-sm leading-snug line-clamp-2">{listing.title}</h3>

                {/* 설명 */}
                {listing.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{listing.description}</p>
                )}

                {/* 제공자 / 단체 */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {listing.organization ? (
                    <><Building2 className="h-3.5 w-3.5 text-blue-500" />
                    <span className="text-blue-600 font-medium">{listing.organization.name} · {listing.organization.dong}</span></>
                  ) : (
                    <><User className="h-3.5 w-3.5" />
                    <span>{listing.provider?.name ?? '알 수 없음'} · {listing.provider?.dong}</span></>
                  )}
                </div>

                {/* 가능 지역 */}
                <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span className="line-clamp-1">{listing.availableDong.join(', ')}</span>
                </div>

                {/* 가능 시간 */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span>{listing.availableTimeFrom} ~ {listing.availableTimeTo}</span>
                </div>

                {/* 가능 요일 */}
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <div className="flex gap-1">
                    {['MON','TUE','WED','THU','FRI','SAT','SUN'].map(d => (
                      <span key={d} className={`text-xs w-5 h-5 flex items-center justify-center rounded-full font-medium ${
                        listing.availableDays.includes(d)
                          ? 'bg-primary text-white'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {DAY_LABEL[d]}
                      </span>
                    ))}
                  </div>
                </div>

                <Button size="sm" className="w-full mt-1" onClick={e => { e.stopPropagation(); openModal(listing) }}>
                  신청하기
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 신청 모달 */}
      <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelected(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>서비스 신청</DialogTitle>
          </DialogHeader>

          {applyDone ? (
            <div className="py-6 text-center space-y-3">
              <div className="text-4xl">✅</div>
              <p className="font-semibold">신청이 완료됐습니다!</p>
              <p className="text-sm text-muted-foreground">코디네이터가 검토 후 연결해 드립니다.</p>
              <Button className="w-full" onClick={() => setSelected(null)}>닫기</Button>
            </div>
          ) : (
            <>
              {/* 서비스 요약 */}
              {selected && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                  <p className="font-semibold">{selected.title}</p>
                  <p className="text-muted-foreground text-xs">
                    {CAT_LABEL[selected.category]} · {Number(selected.tcPerHour).toFixed(1)} TC/h
                  </p>
                  {selected.organization ? (
                    <p className="text-blue-600 text-xs font-medium">
                      🏢 {selected.organization.name} ({selected.organization.dong})
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-xs">
                      제공자: {selected.provider?.name} ({selected.provider?.dong})
                    </p>
                  )}
                  <p className="text-muted-foreground text-xs">
                    가능 지역: {selected?.availableDong?.join(', ')}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    가능 시간: {selected?.availableTimeFrom} ~ {selected?.availableTimeTo}
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="applyDate">희망 날짜 및 시간 *</Label>
                  <Input
                    id="applyDate"
                    type="datetime-local"
                    value={applyForm.requestedDate}
                    onChange={e => setApplyForm(f => ({ ...f, requestedDate: e.target.value }))}
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="applyDuration">
                    소요 시간
                    <span className="text-muted-foreground ml-2 font-normal text-xs">
                      ({applyForm.durationMinutes}분 → 예상 {(applyForm.durationMinutes / 60 * Number(selected?.tcPerHour || 1)).toFixed(2)} TC)
                    </span>
                  </Label>
                  <div className="flex items-center gap-3">
                    <input
                      id="applyDuration"
                      type="range" min={15} max={480} step={15}
                      value={applyForm.durationMinutes}
                      onChange={e => setApplyForm(f => ({ ...f, durationMinutes: Number(e.target.value) }))}
                      className="flex-1"
                    />
                    <span className="text-sm font-semibold w-16 text-right">
                      {applyForm.durationMinutes >= 60
                        ? `${Math.floor(applyForm.durationMinutes/60)}시간${applyForm.durationMinutes%60 ? ` ${applyForm.durationMinutes%60}분` : ''}`
                        : `${applyForm.durationMinutes}분`}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="applyDesc">요청 사항 (선택)</Label>
                  <textarea
                    id="applyDesc"
                    value={applyForm.description}
                    onChange={e => setApplyForm(f => ({ ...f, description: e.target.value }))}
                    rows={3}
                    placeholder="구체적인 요청사항을 입력하세요"
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                  />
                </div>

                {applyError && (
                  <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{applyError}</p>
                )}
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setSelected(null)} disabled={applying}>취소</Button>
                <Button
                  onClick={handleApply}
                  disabled={applying || !applyForm.requestedDate}
                >
                  {applying && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                  신청하기
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
