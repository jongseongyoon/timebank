'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Building2, Plus, Loader2, CheckCircle } from 'lucide-react'

const ORG_TYPE_LABEL: Record<string, string> = {
  COMMUNITY_COUNCIL: '주민자치회', WELFARE_COUNCIL: '사회복지협의회',
  SAEMAEUL: '새마을운동', WOMENS_CLUB: '여성단체', RIGHT_LIVING: '바르게살기운동',
  VOLUNTEER_CAMP: '자원봉사캠프', RED_CROSS: '적십자', SOCIAL_COOP: '사회적협동조합', OTHER: '기타',
}

const DONGS = [
  '양동','양3동','농성1동','농성2동','광천동','유덕동','치평동','상무1동','상무2동',
  '화정1동','화정2동','화정3동','화정4동','서창동','금호1동','금호2동','풍암동','동천동',
]

const CATEGORIES = [
  { value: 'TRANSPORT', label: '🚗 이동지원' }, { value: 'SHOPPING', label: '🛒 장보기' },
  { value: 'COMPANION', label: '💬 말벗' }, { value: 'MEAL', label: '🍱 식사지원' },
  { value: 'HOUSEKEEPING', label: '🏠 가사지원' }, { value: 'MEDICAL_ESCORT', label: '🏥 의료동행' },
  { value: 'EDUCATION', label: '📚 교육' }, { value: 'DIGITAL_HELP', label: '📱 디지털지원' },
  { value: 'REPAIR', label: '🔧 수리' }, { value: 'CHILDCARE', label: '👶 아이돌봄' },
  { value: 'LEGAL_CONSULT', label: '⚖️ 법률상담' }, { value: 'HEALTH_CONSULT', label: '💊 건강상담' },
  { value: 'ADMINISTRATIVE', label: '📋 행정보조' }, { value: 'COMMUNITY_EVENT', label: '🎉 공동체행사' },
  { value: 'OTHER', label: '✨ 기타' },
]

export default function AdminOrganizationsPage() {
  const [orgs, setOrgs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // 단체 등록 폼
  const [orgForm, setOrgForm] = useState({ name: '', orgType: 'COMMUNITY_COUNCIL', dong: '' })
  const [orgSaving, setOrgSaving] = useState(false)
  const [orgMsg, setOrgMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // 단체 서비스 등록 폼
  const [svcForm, setSvcForm] = useState({
    organizationId: '', title: '', description: '', category: 'COMMUNITY_EVENT',
    tcPerHour: '1.0', availableDong: [] as string[], availableDays: [] as string[],
    availableTimeFrom: '09:00', availableTimeTo: '17:00',
  })
  const [svcSaving, setSvcSaving] = useState(false)
  const [svcMsg, setSvcMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const fetchOrgs = () => {
    fetch('/api/organizations').then(r => r.json()).then(d => {
      setOrgs(d.organizations ?? [])
      setLoading(false)
    })
  }
  useEffect(() => { fetchOrgs() }, [])

  async function handleOrgSave() {
    if (!orgForm.name || !orgForm.dong) return
    setOrgSaving(true)
    const res = await fetch('/api/organizations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orgForm),
    })
    if (res.ok) {
      setOrgMsg({ ok: true, text: '단체가 등록됐습니다.' })
      setOrgForm({ name: '', orgType: 'COMMUNITY_COUNCIL', dong: '' })
      fetchOrgs()
    } else {
      setOrgMsg({ ok: false, text: '등록 실패' })
    }
    setOrgSaving(false)
  }

  function toggleDong(dong: string) {
    setSvcForm(f => ({
      ...f,
      availableDong: f.availableDong.includes(dong)
        ? f.availableDong.filter(d => d !== dong)
        : [...f.availableDong, dong],
    }))
  }
  function toggleDay(day: string) {
    setSvcForm(f => ({
      ...f,
      availableDays: f.availableDays.includes(day)
        ? f.availableDays.filter(d => d !== day)
        : [...f.availableDays, day],
    }))
  }

  async function handleSvcSave() {
    if (!svcForm.organizationId || !svcForm.title || svcForm.availableDong.length === 0 || svcForm.availableDays.length === 0) return
    setSvcSaving(true)
    const res = await fetch('/api/services', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...svcForm, tcPerHour: Number(svcForm.tcPerHour) }),
    })
    if (res.ok) {
      setSvcMsg({ ok: true, text: '서비스가 등록됐습니다. 서비스 찾기에서 확인하세요.' })
      setSvcForm(f => ({ ...f, title: '', description: '', availableDong: [], availableDays: [] }))
    } else {
      const d = await res.json()
      setSvcMsg({ ok: false, text: typeof d.error === 'string' ? d.error : '등록 실패' })
    }
    setSvcSaving(false)
  }

  const DAY_KO: Record<string, string> = { MON:'월',TUE:'화',WED:'수',THU:'목',FRI:'금',SAT:'토',SUN:'일' }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Building2 className="h-6 w-6" /> 단체 관리
      </h1>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">단체 목록</TabsTrigger>
          <TabsTrigger value="add">단체 등록</TabsTrigger>
          <TabsTrigger value="service">단체 서비스 등록</TabsTrigger>
        </TabsList>

        {/* 단체 목록 */}
        <TabsContent value="list" className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />불러오는 중…
            </div>
          ) : orgs.length === 0 ? (
            <p className="text-center py-10 text-muted-foreground">등록된 단체가 없습니다.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {orgs.map(org => (
                <Card key={org.id}>
                  <CardContent className="pt-4 space-y-1">
                    <p className="font-semibold">{org.name}</p>
                    <p className="text-sm text-muted-foreground">{ORG_TYPE_LABEL[org.orgType]} · {org.dong}</p>
                    <p className="text-sm text-amber-600 font-medium">TC 잔액: {Number(org.tcBalance).toFixed(2)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 단체 등록 */}
        <TabsContent value="add" className="mt-4">
          <Card className="max-w-md">
            <CardHeader><CardTitle className="text-base">신규 단체 등록</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>단체명 *</Label>
                <Input value={orgForm.name} onChange={e => setOrgForm(f => ({ ...f, name: e.target.value }))} placeholder="예: 풍암동 주민자치회" />
              </div>
              <div className="space-y-1.5">
                <Label>단체 유형 *</Label>
                <select
                  value={orgForm.orgType}
                  onChange={e => setOrgForm(f => ({ ...f, orgType: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {Object.entries(ORG_TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>관할 동 *</Label>
                <select
                  value={orgForm.dong}
                  onChange={e => setOrgForm(f => ({ ...f, dong: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">동을 선택하세요</option>
                  {DONGS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              {orgMsg && (
                <div className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${orgMsg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {orgMsg.ok && <CheckCircle className="h-4 w-4" />}{orgMsg.text}
                </div>
              )}
              <Button className="w-full" onClick={handleOrgSave} disabled={orgSaving || !orgForm.name || !orgForm.dong}>
                {orgSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                <Plus className="h-4 w-4 mr-1" />단체 등록
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 단체 서비스 등록 */}
        <TabsContent value="service" className="mt-4">
          <Card className="max-w-2xl">
            <CardHeader><CardTitle className="text-base">단체 서비스 등록</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>단체 선택 *</Label>
                <select
                  value={svcForm.organizationId}
                  onChange={e => setSvcForm(f => ({ ...f, organizationId: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">단체를 선택하세요</option>
                  {orgs.map(o => <option key={o.id} value={o.id}>{o.name} ({o.dong})</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>서비스 제목 *</Label>
                <Input value={svcForm.title} onChange={e => setSvcForm(f => ({ ...f, title: e.target.value }))} placeholder="예: 주민자치회 마을버스 이동지원" />
              </div>
              <div className="space-y-1.5">
                <Label>서비스 유형 *</Label>
                <select
                  value={svcForm.category}
                  onChange={e => setSvcForm(f => ({ ...f, category: e.target.value }))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>설명</Label>
                <textarea
                  value={svcForm.description}
                  onChange={e => setSvcForm(f => ({ ...f, description: e.target.value }))}
                  rows={2} placeholder="서비스 내용을 입력하세요"
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>TC 단가 (시간당)</Label>
                  <Input type="number" min="0.5" max="3" step="0.5" value={svcForm.tcPerHour}
                    onChange={e => setSvcForm(f => ({ ...f, tcPerHour: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>운영 시간</Label>
                  <div className="flex gap-2">
                    <Input type="time" value={svcForm.availableTimeFrom}
                      onChange={e => setSvcForm(f => ({ ...f, availableTimeFrom: e.target.value }))} className="flex-1" />
                    <Input type="time" value={svcForm.availableTimeTo}
                      onChange={e => setSvcForm(f => ({ ...f, availableTimeTo: e.target.value }))} className="flex-1" />
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>제공 가능 지역 *</Label>
                <div className="flex flex-wrap gap-2">
                  {DONGS.map(d => (
                    <button key={d} type="button" onClick={() => toggleDong(d)}
                      className={`px-3 py-1 rounded-full text-xs border transition-colors ${svcForm.availableDong.includes(d) ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-300 hover:border-primary'}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>운영 요일 *</Label>
                <div className="flex gap-2">
                  {Object.entries(DAY_KO).map(([v, l]) => (
                    <button key={v} type="button" onClick={() => toggleDay(v)}
                      className={`w-9 h-9 rounded-full text-sm font-medium border transition-colors ${svcForm.availableDays.includes(v) ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-300 hover:border-primary'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              {svcMsg && (
                <div className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${svcMsg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {svcMsg.ok && <CheckCircle className="h-4 w-4" />}{svcMsg.text}
                </div>
              )}
              <Button className="w-full" onClick={handleSvcSave}
                disabled={svcSaving || !svcForm.organizationId || !svcForm.title || svcForm.availableDong.length === 0 || svcForm.availableDays.length === 0}>
                {svcSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                서비스 등록하기
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
