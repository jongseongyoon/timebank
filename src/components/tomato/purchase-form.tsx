'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Loader2, CheckCircle2, X, ShoppingCart } from 'lucide-react'
import { searchMembers, createPurchase, type MemberHit } from '@/app/tomato/purchases/actions'

export type CategoryOpt = { id: string; name: string; managementYears: number; pointPercent: number }

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}
function calcDue(dateStr: string, years: number) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  d.setFullYear(d.getFullYear() + years)
  return d.toISOString().slice(0, 10)
}

export function PurchaseForm({
  categories,
  initialMember,
}: {
  categories: CategoryOpt[]
  initialMember?: MemberHit | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [searching, startSearch] = useTransition()
  const [error, setError] = useState('')
  const [done, setDone] = useState<{ pointsEarned: number; balance: number; dueDate: string } | null>(null)

  // 회원 검색·선택
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<MemberHit[]>([])
  const [member, setMember] = useState<MemberHit | null>(initialMember ?? null)

  // 입력값
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '')
  const [productName, setProductName] = useState('')
  const [serialNo, setSerialNo] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(todayStr())
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')

  const cat = categories.find((c) => c.id === categoryId)
  const amountNum = Number(amount) || 0
  const pointsPreview = cat ? Math.round(amountNum * (cat.pointPercent / 100)) : 0
  const duePreview = cat ? calcDue(purchaseDate, cat.managementYears) : ''

  function doSearch() {
    setError('')
    startSearch(async () => {
      try {
        setHits(await searchMembers(q))
      } catch {
        setError('회원 검색 중 오류가 발생했습니다.')
      }
    })
  }

  function submit() {
    setError('')
    setDone(null)
    if (!member) return setError('회원을 먼저 선택하세요.')
    startTransition(async () => {
      const res = await createPurchase({
        memberId: member.id,
        categoryId,
        productName,
        serialNo,
        purchaseDate,
        purchaseAmount: amount,
        memo,
      })
      if ('error' in res) {
        setError(res.error)
      } else {
        setDone({ pointsEarned: res.pointsEarned, balance: res.balance, dueDate: res.dueDate })
        // 입력 초기화(회원은 유지)
        setProductName(''); setSerialNo(''); setAmount(''); setMemo('')
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-5">
      {error && (
        <p role="alert" className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
      )}
      {done && (
        <Card className="border-red-200">
          <CardContent className="pt-5 flex items-center gap-3 text-sm">
            <CheckCircle2 className="h-5 w-5 text-red-600 shrink-0" aria-hidden="true" />
            <span>
              구매 등록 완료 — <b>{done.pointsEarned.toLocaleString()}P</b> 적립, 관리기한{' '}
              <b>{done.dueDate}</b>, 현재 잔액 <b>{done.balance.toLocaleString()}P</b>
            </span>
          </CardContent>
        </Card>
      )}

      {/* 회원 선택 */}
      <Card>
        <CardContent className="pt-5">
          <p className="font-semibold text-sm mb-3">1. 회원 선택</p>
          {member ? (
            <div className="flex items-center justify-between rounded-md border px-3 py-2.5">
              <div className="text-sm">
                <span className="font-medium">{member.name}</span>
                <span className="text-muted-foreground"> · {member.memberNo || '번호없음'} · {member.phone || '-'}</span>
                <Badge variant="secondary" className="ml-2">{member.pointsBalance.toLocaleString()}P</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setMember(null)}>
                <X className="h-4 w-4" /> 변경
              </Button>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <Input
                  value={q} onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && doSearch()}
                  placeholder="이름 / 회원번호 / 전화" className="max-w-xs"
                />
                <Button variant="secondary" onClick={doSearch} disabled={searching}>
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} 검색
                </Button>
              </div>
              {hits.length > 0 && (
                <div className="mt-2 border rounded-md divide-y">
                  {hits.map((h) => (
                    <button
                      key={h.id} type="button"
                      onClick={() => { setMember(h); setHits([]); setQ('') }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex justify-between"
                    >
                      <span>{h.name} <span className="text-muted-foreground">· {h.memberNo || '-'} · {h.phone || '-'}</span></span>
                      <span className="text-muted-foreground">{h.pointsBalance.toLocaleString()}P</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 구매 정보 */}
      <Card>
        <CardContent className="pt-5 space-y-4">
          <p className="font-semibold text-sm">2. 구매 정보</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">제품 카테고리 *</label>
              <select
                value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
                className="w-full h-9 rounded-md border px-2 text-sm bg-white"
              >
                {categories.length === 0 && <option value="">카테고리 없음</option>}
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} (관리 {c.managementYears}년 · {c.pointPercent}%)</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">구매일 *</label>
              <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">모델명</label>
              <Input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="예: SC-100" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">시리얼 번호</label>
              <Input value={serialNo} onChange={(e) => setSerialNo(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">구매액 (원) *</label>
              <Input type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">메모</label>
              <Input value={memo} onChange={(e) => setMemo(e.target.value)} />
            </div>
          </div>

          {/* 자동 계산 미리보기 */}
          <div className="flex flex-wrap gap-3 rounded-md bg-red-50/60 border border-red-100 px-3 py-2.5 text-sm">
            <span>적립 예정 <b className="text-red-700">{pointsPreview.toLocaleString()}P</b>
              <span className="text-muted-foreground"> ({cat?.pointPercent ?? 0}% 반올림)</span>
            </span>
            <span className="text-gray-300">|</span>
            <span>관리기한 <b>{duePreview || '-'}</b>
              <span className="text-muted-foreground"> (구매일 +{cat?.managementYears ?? 0}년)</span>
            </span>
          </div>

          <Button onClick={submit} disabled={pending || !member || !categoryId || !amount}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
            구매 등록 + 포인트 적립
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
