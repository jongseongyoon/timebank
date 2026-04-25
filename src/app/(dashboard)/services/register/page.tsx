'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle, Loader2, Info, Navigation } from 'lucide-react'
import { getRateByCategory } from '@/lib/tc-calculator'

const CATEGORIES = [
  { value: 'TRANSPORT', label: '이동지원', emoji: '🚗' },
  { value: 'SHOPPING', label: '장보기', emoji: '🛒' },
  { value: 'COMPANION', label: '말벗', emoji: '💬' },
  { value: 'MEAL', label: '식사지원', emoji: '🍱' },
  { value: 'HOUSEKEEPING', label: '가사지원', emoji: '🏠' },
  { value: 'MEDICAL_ESCORT', label: '의료동행', emoji: '🏥' },
  { value: 'EDUCATION', label: '교육', emoji: '📚' },
  { value: 'DIGITAL_HELP', label: '디지털지원', emoji: '📱' },
  { value: 'REPAIR', label: '수리', emoji: '🔧' },
  { value: 'CHILDCARE', label: '아이돌봄', emoji: '👶' },
  { value: 'LEGAL_CONSULT', label: '법률상담', emoji: '⚖️' },
  { value: 'HEALTH_CONSULT', label: '건강상담', emoji: '💊' },
  { value: 'ADMINISTRATIVE', label: '행정보조', emoji: '📋' },
  { value: 'COMMUNITY_EVENT', label: '공동체행사', emoji: '🎉' },
  { value: 'OTHER', label: '기타', emoji: '✨' },
]

const DAYS = [
  { value: 'MON', label: '월' }, { value: 'TUE', label: '화' }, { value: 'WED', label: '수' },
  { value: 'THU', label: '목' }, { value: 'FRI', label: '금' }, { value: 'SAT', label: '토' },
  { value: 'SUN', label: '일' },
]

const DONGS = [
  '양동', '양3동', '농성1동', '농성2동', '광천동', '유덕동',
  '치평동', '상무1동', '상무2동', '화정1동', '화정2동',
  '화정3동', '화정4동', '서창동', '금호1동', '금호2동',
  '풍암동', '동천동',
]

export default function ServiceRegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [geoLoading, setGeoLoading] = useState(false)

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    availableDong: [] as string[],
    availableDays: [] as string[],
    availableTimeFrom: '09:00',
    availableTimeTo: '17:00',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
  })

  function toggleDong(d: string) {
    setForm((f) => ({ ...f, availableDong: f.availableDong.includes(d) ? f.availableDong.filter((x) => x !== d) : [...f.availableDong, d] }))
  }

  function toggleDay(d: string) {
    setForm((f) => ({ ...f, availableDays: f.availableDays.includes(d) ? f.availableDays.filter((x) => x !== d) : [...f.availableDays, d] }))
  }

  function detectLocation() {
    if (!navigator.geolocation) {
      setError('이 브라우저에서는 위치 서비스를 지원하지 않습니다.')
      return
    }
    setGeoLoading(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(f => ({
          ...f,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }))
        setGeoLoading(false)
      },
      () => {
        setError('위치 감지에 실패했습니다. 브라우저 위치 권한을 확인해 주세요.')
        setGeoLoading(false)
      },
      { timeout: 10000 }
    )
  }

  const tcRate = form.category ? getRateByCategory(form.category as any) : 1.0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.category) { setError('서비스 유형을 선택하세요.'); return }
    if (form.availableDong.length === 0) { setError('제공 가능 지역을 선택하세요.'); return }
    if (form.availableDays.length === 0) { setError('가능 요일을 선택하세요.'); return }

    setLoading(true)
    setError('')

    const res = await fetch('/api/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, tcPerHour: tcRate }),
    })

    if (res.ok) {
      setDone(true)
    } else {
      const d = await res.json()
      setError(d.error ?? '오류가 발생했습니다.')
    }
    setLoading(false)
  }

  if (done) {
    return (
      <div className="max-w-lg mx-auto">
        <Card>
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="text-xl font-bold">서비스가 등록되었습니다!</h2>
            <p className="text-muted-foreground text-sm">수요자의 요청이 있으면 코디네이터가 연결해 드립니다.</p>
            <Button className="w-full" onClick={() => router.push('/')}>대시보드로 돌아가기</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">서비스 등록</h1>
        <p className="text-muted-foreground text-sm mt-1">제공 가능한 서비스를 등록하세요</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">기본 정보</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">서비스 제목 *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="예: 장보기 도우미"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">상세 설명</Label>
              <textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                placeholder="제공 가능한 서비스를 구체적으로 설명해 주세요."
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* 위치 등록 (선택) */}
        <Card>
          <CardHeader><CardTitle className="text-base">서비스 위치 (선택)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              위치를 등록하면 &quot;내 주변 순&quot; 검색 시 더 쉽게 발견됩니다.
            </p>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={detectLocation}
                disabled={geoLoading}
                className="gap-2"
              >
                {geoLoading
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Navigation className="h-4 w-4" />
                }
                {form.latitude ? '위치 재감지' : '현재 위치 감지'}
              </Button>
              {form.latitude && form.longitude && (
                <p className="text-xs text-green-700 font-medium">
                  ✅ 위치 등록됨 ({form.latitude.toFixed(4)}, {form.longitude.toFixed(4)})
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">서비스 유형 *</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, category: cat.value }))}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border text-sm transition-colors ${
                    form.category === cat.value
                      ? 'border-primary bg-primary/5 text-primary font-medium'
                      : 'border-input hover:bg-accent'
                  }`}
                  aria-pressed={form.category === cat.value}
                >
                  <span className="text-2xl" aria-hidden="true">{cat.emoji}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            {form.category && (
              <div className="mt-4 flex items-center gap-2 bg-blue-50 text-blue-800 rounded-md px-3 py-2 text-sm">
                <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
                이 서비스를 등록하면 시간당 <strong>{tcRate.toFixed(1)} TC</strong>를 적립받습니다.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">제공 가능 지역 *</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {DONGS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDong(d)}
                  className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                    form.availableDong.includes(d)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-input hover:bg-accent'
                  }`}
                  aria-pressed={form.availableDong.includes(d)}
                >
                  {d}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">가능 요일 및 시간 *</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="mb-2 block">가능 요일</Label>
              <div className="flex gap-2 flex-wrap">
                {DAYS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleDay(d.value)}
                    className={`w-10 h-10 rounded-full border text-sm font-medium transition-colors ${
                      form.availableDays.includes(d.value)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-input hover:bg-accent'
                    }`}
                    aria-pressed={form.availableDays.includes(d.value)}
                    aria-label={d.label + '요일'}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="timeFrom">시작 시간</Label>
                <Input
                  id="timeFrom"
                  type="time"
                  value={form.availableTimeFrom}
                  onChange={(e) => setForm((f) => ({ ...f, availableTimeFrom: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeTo">종료 시간</Label>
                <Input
                  id="timeTo"
                  type="time"
                  value={form.availableTimeTo}
                  onChange={(e) => setForm((f) => ({ ...f, availableTimeTo: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <p role="alert" className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
        )}

        <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
          서비스 등록하기
        </Button>
      </form>
    </div>
  )
}
