'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, MinusCircle, SlidersHorizontal } from 'lucide-react'
import { redeemAction, adjustAction, type PointActionResult } from '@/app/tomato/members/[id]/actions'

const REDEEM_REASONS = ['AS비용', '물품구입']

export function MemberActions({ memberId, balance }: { memberId: string; balance: number }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // 사용
  const [redeemAmt, setRedeemAmt] = useState('')
  const [redeemReason, setRedeemReason] = useState(REDEEM_REASONS[0])
  // 조정
  const [adjAmt, setAdjAmt] = useState('')
  const [adjReason, setAdjReason] = useState('')

  function run(fn: () => Promise<PointActionResult>, okText: (b: number) => string, reset: () => void) {
    setMsg(null)
    startTransition(async () => {
      const res = await fn()
      if ('error' in res) setMsg({ type: 'err', text: res.error })
      else {
        setMsg({ type: 'ok', text: okText(res.balance) })
        reset()
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-4">
      {msg && (
        <p
          role="alert"
          className={
            'text-sm rounded-md px-3 py-2 ' +
            (msg.type === 'ok' ? 'bg-green-50 text-green-800' : 'bg-destructive/10 text-destructive')
          }
        >
          {msg.text}
        </p>
      )}

      {/* 포인트 사용 */}
      <div className="rounded-md border p-3">
        <p className="text-sm font-semibold mb-2 flex items-center gap-2">
          <MinusCircle className="h-4 w-4 text-red-600" aria-hidden="true" /> 포인트 사용
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">사용 포인트</label>
            <Input
              type="number" inputMode="numeric" value={redeemAmt}
              onChange={(e) => setRedeemAmt(e.target.value)} placeholder="0" className="w-32"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">사유</label>
            <select
              value={redeemReason} onChange={(e) => setRedeemReason(e.target.value)}
              className="h-9 rounded-md border px-2 text-sm bg-white"
            >
              {REDEEM_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <Button
            variant="outline" disabled={pending || !redeemAmt}
            onClick={() =>
              run(
                () => redeemAction({ memberId, amount: redeemAmt, reason: redeemReason }),
                (b) => `사용 완료. 현재 잔액 ${b.toLocaleString()}P`,
                () => setRedeemAmt('')
              )
            }
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MinusCircle className="h-4 w-4" />}
            사용
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">보유 {balance.toLocaleString()}P · 잔액 부족 시 거부됩니다.</p>
      </div>

      {/* 수동 조정 */}
      <div className="rounded-md border p-3">
        <p className="text-sm font-semibold mb-2 flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-slate-600" aria-hidden="true" /> 수동 조정 (±)
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">가감 포인트 (음수 가능)</label>
            <Input
              type="number" inputMode="numeric" value={adjAmt}
              onChange={(e) => setAdjAmt(e.target.value)} placeholder="예: 500 또는 -500" className="w-44"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">사유</label>
            <Input value={adjReason} onChange={(e) => setAdjReason(e.target.value)} placeholder="조정 사유" className="w-44" />
          </div>
          <Button
            variant="outline" disabled={pending || !adjAmt || !adjReason}
            onClick={() =>
              run(
                () => adjustAction({ memberId, amount: adjAmt, reason: adjReason }),
                (b) => `조정 완료. 현재 잔액 ${b.toLocaleString()}P`,
                () => { setAdjAmt(''); setAdjReason('') }
              )
            }
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SlidersHorizontal className="h-4 w-4" />}
            조정
          </Button>
        </div>
      </div>
    </div>
  )
}
