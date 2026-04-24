'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, CheckCircle, Loader2 } from 'lucide-react'

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

const DONGS = [
  '양동', '양3동', '농성1동', '농성2동', '광천동', '유덕동',
  '치평동', '상무1동', '상무2동', '화정1동', '화정2동',
  '화정3동', '화정4동', '서창동', '금호1동', '금호2동',
  '풍암동', '동천동',
]

const STEPS = ['카테고리', '일정 · 시간', '장소 · 상세', '긴급도', '확인']

export default function ServiceRequestPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    category: '',
    requestedDate: '',
    durationMinutes: 60,
    dong: '',
    description: '',
    urgency: 'NORMAL' as 'NORMAL' | 'URGENT' | 'EMERGENCY',
  })

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  const estimatedTC = (form.durationMinutes / 60).toFixed(2)

  async function submit() {
    setLoading(true)
    setError('')
    const res = await fetch('/api/services/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, requestedDate: new Date(form.requestedDate).toISOString() }),
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
            <h2 className="text-xl font-bold">요청이 등록되었습니다!</h2>
            <p className="text-muted-foreground text-sm">코디네이터가 검토 후 제공자를 연결해 드립니다.</p>
            <Button className="w-full" onClick={() => router.push('/')}>대시보드로 돌아가기</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">서비스 요청</h1>
        <p className="text-muted-foreground text-sm mt-1">필요한 서비스를 요청하세요</p>
      </div>

      {/* 스텝 인디케이터 */}
      <div className="flex items-center gap-1">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center gap-1 flex-1">
            <div className={`w-full h-1.5 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-muted'}`} />
          </div>
        ))}
      </div>
      <p className="text-sm font-medium text-center text-muted-foreground">
        {step + 1} / {STEPS.length} — {STEPS[step]}
      </p>

      <Card>
        <CardContent className="pt-6">
          {/* Step 0: 카테고리 */}
          {step === 0 && (
            <div className="space-y-3">
              <Label>어떤 서비스가 필요하신가요? *</Label>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => set('category', cat.value)}
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
            </div>
          )}

          {/* Step 1: 일정·시간 */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="date">날짜 및 시간 *</Label>
                <Input
                  id="date"
                  type="datetime-local"
                  value={form.requestedDate}
                  onChange={(e) => set('requestedDate', e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">예상 소요 시간</Label>
                <div className="flex items-center gap-3">
                  <input
                    id="duration"
                    type="range"
                    min={15} max={480} step={15}
                    value={form.durationMinutes}
                    onChange={(e) => set('durationMinutes', Number(e.target.value))}
                    className="flex-1"
                    aria-label={`소요시간 ${form.durationMinutes}분`}
                  />
                  <span className="text-sm font-semibold w-20 text-right">
                    {form.durationMinutes >= 60
                      ? `${Math.floor(form.durationMinutes / 60)}시간 ${form.durationMinutes % 60 ? form.durationMinutes % 60 + '분' : ''}`
                      : `${form.durationMinutes}분`}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: 장소·상세 */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dong">지역 *</Label>
                <select
                  id="dong"
                  value={form.dong}
                  onChange={(e) => set('dong', e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">동을 선택하세요</option>
                  {DONGS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">상세 요청사항 *</Label>
                <textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  rows={4}
                  placeholder="구체적인 요청 내용을 입력해 주세요. (최소 10자)"
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
              </div>
            </div>
          )}

          {/* Step 3: 긴급도 */}
          {step === 3 && (
            <div className="space-y-3">
              <Label>긴급도를 선택해 주세요</Label>
              {[
                { value: 'NORMAL', label: '일반', desc: '여유 있게 처리', color: 'border-input' },
                { value: 'URGENT', label: '긴급', desc: '1주일 이내 처리', color: 'border-yellow-400 bg-yellow-50' },
                { value: 'EMERGENCY', label: '응급', desc: '72시간 내 보장', color: 'border-red-400 bg-red-50' },
              ].map((u) => (
                <button
                  key={u.value}
                  type="button"
                  onClick={() => set('urgency', u.value as any)}
                  className={`w-full flex items-center justify-between p-4 rounded-lg border-2 text-left transition-colors ${
                    form.urgency === u.value ? u.color + ' font-semibold' : 'border-input hover:bg-accent'
                  }`}
                  aria-pressed={form.urgency === u.value}
                >
                  <div>
                    <p className="font-medium">{u.label}</p>
                    <p className="text-xs text-muted-foreground">{u.desc}</p>
                  </div>
                  {form.urgency === u.value && <CheckCircle className="h-5 w-5 text-primary" aria-hidden="true" />}
                </button>
              ))}
            </div>
          )}

          {/* Step 4: 확인 */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="font-semibold">요청 내용 확인</h3>
              <dl className="space-y-3 text-sm">
                {[
                  ['서비스', CATEGORIES.find((c) => c.value === form.category)?.label],
                  ['날짜/시간', form.requestedDate ? new Date(form.requestedDate).toLocaleString('ko-KR') : '-'],
                  ['소요 시간', `${form.durationMinutes}분`],
                  ['지역', form.dong],
                  ['긴급도', { NORMAL: '일반', URGENT: '긴급', EMERGENCY: '응급' }[form.urgency]],
                  ['요청 내용', form.description],
                ].map(([label, value]) => (
                  <div key={label} className="flex gap-3">
                    <dt className="text-muted-foreground w-24 shrink-0">{label}</dt>
                    <dd className="font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="bg-blue-50 rounded-lg p-4 mt-4">
                <p className="text-sm text-blue-800">
                  예상 TC 비용: <strong className="text-lg">{estimatedTC} TC</strong>
                </p>
                <p className="text-xs text-blue-600 mt-1">* 실제 TC는 코디네이터 승인 후 차감됩니다.</p>
              </div>
              {error && (
                <p role="alert" className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 네비게이션 버튼 */}
      <div className="flex gap-3">
        {step > 0 && (
          <Button variant="outline" onClick={() => setStep((s) => s - 1)} className="flex-1">
            <ChevronLeft className="mr-1 h-4 w-4" aria-hidden="true" /> 이전
          </Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button
            onClick={() => setStep((s) => s + 1)}
            className="flex-1"
            disabled={
              (step === 0 && !form.category) ||
              (step === 1 && !form.requestedDate) ||
              (step === 2 && (!form.dong || form.description.length < 10))
            }
          >
            다음 <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button onClick={submit} className="flex-1" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            요청 제출
          </Button>
        )}
      </div>
    </div>
  )
}
