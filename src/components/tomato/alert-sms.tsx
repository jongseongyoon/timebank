'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { sendDueDateSms, type SmsScope } from '@/app/tomato/alerts/actions'

const DEFAULT_MSG =
  '[토마토의료기] {이름}님 안녕하세요. 구매하신 제품의 관리기한이 다가오거나 지났습니다. 내 포인트·관리기한 확인: {링크} · 점검·재구매는 매장으로 연락 주세요.'

export function AlertSms({ overdue, upcoming }: { overdue: number; upcoming: number }) {
  const [pending, startTransition] = useTransition()
  const [scope, setScope] = useState<SmsScope>('both')
  const [message, setMessage] = useState(DEFAULT_MSG)
  const [testMode, setTestMode] = useState(true)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState('')

  const scopeCount = scope === 'overdue' ? overdue : scope === 'upcoming' ? upcoming : overdue + upcoming

  function send() {
    setError('')
    setResult(null)
    if (!testMode) {
      const ok = window.confirm(
        `실제 문자를 발송합니다(요금 발생). 대상 약 ${scopeCount}건. 계속할까요?`
      )
      if (!ok) return
    }
    startTransition(async () => {
      const res = await sendDueDateSms({ scope, message, testMode })
      if ('error' in res) setError(res.error)
      else
        setResult(
          `${res.testMode ? '[테스트] ' : ''}대상 ${res.targets}명 · 성공 ${res.success} · 실패 ${res.fail}`
        )
    })
  }

  return (
    <div className="space-y-3">
      <p className="font-semibold text-sm flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-red-600" aria-hidden="true" /> 안내 문자 발송 (알리고)
      </p>

      {error && (
        <p role="alert" className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
      )}
      {result && (
        <p className="text-sm text-green-800 bg-green-50 rounded-md px-3 py-2 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> {result}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">대상</span>
        {(['both', 'overdue', 'upcoming'] as SmsScope[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setScope(s)}
            className={
              'px-3 py-1.5 rounded-full border text-sm ' +
              (scope === s ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-600 border-gray-300')
            }
          >
            {s === 'both' ? '초과+임박' : s === 'overdue' ? '초과만' : '임박만'}
          </button>
        ))}
        <Badge variant="secondary">약 {scopeCount}건</Badge>
      </div>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={4}
        className="w-full rounded-md border px-3 py-2 text-sm"
        maxLength={1000}
      />
      <p className="text-xs text-muted-foreground">
        {message.length}자 · 90바이트 초과 시 LMS로 발송됩니다. ·{' '}
        <b>{'{이름}'}</b>=회원 이름, <b>{'{링크}'}</b>=회원 개인 조회 링크로 자동 치환(회원별 맞춤 발송).
      </p>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={testMode} onChange={(e) => setTestMode(e.target.checked)} />
        테스트 발송 (실제 전송·과금 없음)
      </label>

      {!testMode && (
        <p className="text-xs text-orange-600 flex items-center gap-1">
          <AlertTriangle className="h-3.5 w-3.5" /> 실제 발송 모드입니다. 발송 시 요금이 부과됩니다.
        </p>
      )}

      <Button onClick={send} disabled={pending || !message.trim() || scopeCount === 0} variant={testMode ? 'outline' : 'default'}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
        {testMode ? '테스트 발송' : '실제 발송'}
      </Button>
    </div>
  )
}
