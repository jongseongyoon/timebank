'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { User, Phone, Mail, MapPin, Coins, Calendar, Shield, Pencil, Check, X, Loader2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'

const DONGS = [
  '양동', '양3동', '농성1동', '농성2동', '광천동', '유덕동',
  '치평동', '상무1동', '상무2동', '화정1동', '화정2동',
  '화정3동', '화정4동', '서창동', '금호1동', '금호2동',
  '풍암동', '동천동',
]

const ROLE_LABEL: Record<string, string> = {
  RECEIVER: '수요자',
  PROVIDER: '제공자',
  COORDINATOR: '코디네이터',
  ADMIN: '관리자',
}

const ROLE_COLOR: Record<string, string> = {
  RECEIVER: 'bg-blue-100 text-blue-700',
  PROVIDER: 'bg-green-100 text-green-700',
  COORDINATOR: 'bg-purple-100 text-purple-700',
  ADMIN: 'bg-red-100 text-red-700',
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: '활성',
  DORMANT: '휴면',
  SUSPENDED: '정지',
  WITHDRAWN: '탈퇴',
}

// 생년월일 표시용 포맷 (YYYYMMDD → YYYY. MM. DD.)
function formatBirthDate(birthDate: string | null | undefined): string {
  if (!birthDate || birthDate.length < 4) return '미등록'
  if (birthDate.length === 8) {
    return `${birthDate.slice(0, 4)}. ${birthDate.slice(4, 6)}. ${birthDate.slice(6, 8)}.`
  }
  return birthDate
}

// 생년월일로 나이 계산
function calcAge(birthDate: string | null | undefined): number | null {
  if (!birthDate || birthDate.length < 4) return null
  const year = parseInt(birthDate.slice(0, 4), 10)
  if (isNaN(year)) return null
  return new Date().getFullYear() - year
}

export default function ProfilePage() {
  const [member, setMember] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [form, setForm] = useState({ email: '', dong: '', address: '', birthDate: '' })

  useEffect(() => {
    fetch('/api/members/me')
      .then((r) => r.json())
      .then(({ member }) => {
        if (!member) {
          setLoadError('회원 정보를 불러올 수 없습니다.')
          setLoading(false)
          return
        }
        setMember(member)
        setForm({
          email: member?.email ?? '',
          dong: member?.dong ?? '',
          address: member?.address ?? '',
          birthDate: member?.birthDate ?? '',
        })
        setLoading(false)
      })
      .catch(() => {
        setLoadError('네트워크 오류가 발생했습니다. 새로고침 후 다시 시도해주세요.')
        setLoading(false)
      })
  }, [])

  async function handleSave() {
    setSaving(true)
    setSaveError('')
    // 생년월일 8자리 유효성 검사
    if (form.birthDate && !/^\d{8}$/.test(form.birthDate)) {
      setSaveError('생년월일은 8자리 숫자로 입력해주세요 (예: 19690301)')
      setSaving(false)
      return
    }

    const res = await fetch('/api/members/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.email || undefined,
        dong: form.dong || undefined,
        address: form.address || undefined,
        birthDate: form.birthDate || undefined,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      setSaveError('저장에 실패했습니다.')
    } else {
      setMember((prev: any) => ({ ...prev, ...data.member }))
      setEditing(false)
    }
    setSaving(false)
  }

  function handleCancel() {
    setForm({
      email: member?.email ?? '',
      dong: member?.dong ?? '',
      address: member?.address ?? '',
      birthDate: member?.birthDate ?? '',
    })
    setSaveError('')
    setEditing(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        불러오는 중…
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <p className="text-red-500 text-sm">{loadError}</p>
        <Button variant="outline" onClick={() => { setLoadError(''); setLoading(true); location.reload() }}>
          새로고침
        </Button>
      </div>
    )
  }

  if (!member) return null

  const age = calcAge(member.birthDate)
  const daysLeft = member.tcExpiresAt
    ? Math.ceil((new Date(member.tcExpiresAt).getTime() - Date.now()) / 86400000)
    : null

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">내 정보</h1>
        {!editing && (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4 mr-1" />
            수정
          </Button>
        )}
      </div>

      {/* 기본 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            기본 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 이름 / 상태 */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">{member.name}</p>
              <p className="text-sm text-muted-foreground">
                {age !== null ? `${age}세 · ` : ''}가입일 {formatDate(member.createdAt)}
              </p>
            </div>
            <Badge className={member.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
              {STATUS_LABEL[member.status] ?? member.status}
            </Badge>
          </div>

          {/* 역할 */}
          <div className="flex items-center gap-2 flex-wrap">
            <Shield className="h-4 w-4 text-muted-foreground" />
            {member.roles?.map((r: string) => (
              <span key={r} className={`text-xs font-medium px-2 py-1 rounded-full ${ROLE_COLOR[r] ?? 'bg-gray-100 text-gray-700'}`}>
                {ROLE_LABEL[r] ?? r}
              </span>
            ))}
            {member.isVulnerable && <span className="text-xs font-medium px-2 py-1 rounded-full bg-amber-100 text-amber-700">취약계층</span>}
            {member.isDisabled && <span className="text-xs font-medium px-2 py-1 rounded-full bg-amber-100 text-amber-700">장애인</span>}
          </div>

          {/* 전화번호 */}
          <div className="flex items-center gap-3 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
            <span>{member.phone}</span>
          </div>

          {/* 생년월일 */}
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            {editing ? (
              <div className="flex-1">
                <Input
                  value={form.birthDate}
                  onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value.replace(/\D/g, '').slice(0, 8) }))}
                  placeholder="19690301 (년월일 8자리)"
                  inputMode="numeric"
                  maxLength={8}
                  className="h-8 text-sm"
                />
                <p className="text-xs text-gray-400 mt-0.5">예: 1969년 3월 1일 → 19690301</p>
              </div>
            ) : (
              <span className={member.birthDate ? '' : 'text-muted-foreground'}>
                {formatBirthDate(member.birthDate)}
                {!member.birthDate && (
                  <span className="ml-1 text-xs text-blue-500">(수정 버튼으로 입력 가능)</span>
                )}
              </span>
            )}
          </div>

          {/* 이메일 */}
          <div className="flex items-center gap-3 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
            {editing ? (
              <Input
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="이메일 (선택)"
                type="email"
                className="h-8 text-sm"
              />
            ) : (
              <span className={member.email ? '' : 'text-muted-foreground'}>
                {member.email ?? '미등록'}
              </span>
            )}
          </div>

          {/* 관할 동 */}
          <div className="flex items-center gap-3 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
            {editing ? (
              <select
                value={form.dong}
                onChange={(e) => setForm((f) => ({ ...f, dong: e.target.value }))}
                className="h-8 px-2 rounded-md border border-input text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">동을 선택하세요</option>
                {DONGS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            ) : (
              <span>{member.dong}</span>
            )}
          </div>

          {/* 상세 주소 */}
          <div className="flex items-center gap-3 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground shrink-0 opacity-0" />
            {editing ? (
              <Input
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="상세 주소 (선택)"
                className="h-8 text-sm"
              />
            ) : (
              <span className="text-muted-foreground text-xs">
                {member.address ?? '상세 주소 미등록'}
              </span>
            )}
          </div>

          {/* 저장 / 취소 버튼 */}
          {editing && (
            <div className="flex items-center gap-2 pt-2">
              {saveError && <p className="text-xs text-destructive flex-1">{saveError}</p>}
              <div className="flex gap-2 ml-auto">
                <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
                  <X className="h-4 w-4 mr-1" />
                  취소
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                  저장
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* TP 현황 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Coins className="h-4 w-4" />
            TP 현황
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">현재 잔액</p>
              <p className="text-2xl font-bold text-blue-600">{Number(member.tcBalance).toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">TP</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">누적 적립</p>
              <p className="text-2xl font-bold text-green-600">{Number(member.lifetimeEarned).toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">TP</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">누적 소진</p>
              <p className="text-2xl font-bold text-red-500">{Number(member.lifetimeSpent).toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">TP</p>
            </div>
          </div>

          {/* TP 만료일 */}
          {member.tcExpiresAt && (
            <div className={`mt-4 flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
              daysLeft !== null && daysLeft <= 30
                ? 'bg-amber-50 border border-amber-200 text-amber-800'
                : 'bg-gray-50 border border-gray-200 text-gray-600'
            }`}>
              <Calendar className="h-4 w-4 shrink-0" />
              <span>
                TP 만료일: <strong>{formatDate(member.tcExpiresAt)}</strong>
                {daysLeft !== null && <span className="ml-2">({daysLeft > 0 ? `${daysLeft}일 남음` : '만료됨'})</span>}
              </span>
            </div>
          )}
          {!member.tcExpiresAt && (
            <div className="mt-4 flex items-center gap-2 rounded-md px-3 py-2 text-sm bg-green-50 border border-green-200 text-green-700">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>TP 만료 없음 (취약계층/장애인 혜택 적용)</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
