'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatDate } from '@/lib/utils'
import { Search, Loader2, Gift } from 'lucide-react'

const ROLE_LABEL: Record<string, string> = {
  RECEIVER: '수요자', PROVIDER: '제공자', COORDINATOR: '코디', ADMIN: '관리자',
}

export default function CoordMembersPage() {
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [allocating, setAllocating] = useState<string | null>(null)
  const [allocAmount, setAllocAmount] = useState<Record<string, number>>({})
  const [showAllocForm, setShowAllocForm] = useState<string | null>(null)

  async function fetchMembers() {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (roleFilter) params.set('role', roleFilter)
    const res = await fetch(`/api/coordinator/members?${params}`)
    const d = await res.json()
    setMembers(d.members ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchMembers() }, [])

  async function handleAllocate(memberId: string) {
    const amount = allocAmount[memberId] ?? 10
    setAllocating(memberId)
    const res = await fetch(`/api/coordinator/members/${memberId}/allocate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tcAmount: amount }),
    })
    if (res.ok) {
      setMembers((prev) =>
        prev.map((m) => m.id === memberId ? { ...m, tcBalance: Number(m.tcBalance) + amount } : m)
      )
      setShowAllocForm(null)
    }
    setAllocating(null)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">회원 관리</h1>

      {/* 검색 필터 */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            placeholder="이름 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchMembers()}
            className="pl-9"
            aria-label="이름 검색"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="역할 필터"
        >
          <option value="">전체 역할</option>
          <option value="RECEIVER">수요자</option>
          <option value="PROVIDER">제공자</option>
        </select>
        <Button onClick={fetchMembers} size="sm" variant="outline">조회</Button>
      </div>

      <p className="text-sm text-muted-foreground">총 {members.length}명</p>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="불러오는 중" />
        </div>
      ) : (
        <Card>
          <CardContent className="pt-4 divide-y">
            {members.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">회원이 없습니다.</p>
            )}
            {members.map((member) => (
              <div key={member.id} className="py-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{member.name}</span>
                      {member.roles.map((r: string) => (
                        <Badge key={r} variant="outline" className="text-xs">{ROLE_LABEL[r] ?? r}</Badge>
                      ))}
                      {member.isVulnerable && <Badge variant="warning" className="text-xs">취약계층</Badge>}
                      {member.isDisabled && <Badge variant="secondary" className="text-xs">장애인</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {member.phone} · 가입 {formatDate(member.createdAt)}
                    </p>
                    <p className="text-xs mt-1">
                      TC 잔액: <span className="font-semibold text-blue-600">{Number(member.tcBalance).toFixed(2)} TC</span>
                      {member.tcExpiresAt && (
                        <span className="text-muted-foreground ml-2">
                          (만료 {formatDate(member.tcExpiresAt)})
                        </span>
                      )}
                      {!member.tcExpiresAt && (
                        <span className="text-muted-foreground ml-2">(무기한)</span>
                      )}
                    </p>
                  </div>

                  {member.isVulnerable && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAllocForm(showAllocForm === member.id ? null : member.id)}
                      aria-label={`${member.name} TC 배분`}
                      aria-expanded={showAllocForm === member.id}
                    >
                      <Gift className="h-4 w-4 mr-1" aria-hidden="true" />
                      TC 배분
                    </Button>
                  )}
                </div>

                {showAllocForm === member.id && (
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-md p-3">
                    <Label htmlFor={`alloc-${member.id}`} className="shrink-0 text-sm">배분 TC</Label>
                    <Input
                      id={`alloc-${member.id}`}
                      type="number"
                      min={1}
                      max={50}
                      value={allocAmount[member.id] ?? 10}
                      onChange={(e) => setAllocAmount((prev) => ({ ...prev, [member.id]: Number(e.target.value) }))}
                      className="w-24 h-8"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleAllocate(member.id)}
                      disabled={allocating === member.id}
                      className="h-8"
                    >
                      {allocating === member.id
                        ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                        : '지급'
                      }
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowAllocForm(null)}
                      className="h-8"
                      aria-label="취소"
                    >
                      취소
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
