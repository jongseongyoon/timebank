/**
 * 등록서식(record) + 조치 아이템 렌더 (명령서 §3.1.3, §6)
 * record 본문은 가독성 있게, 사례회의 조치는 기한·해결여부 강조.
 */
import { CalendarClock, CheckCircle2, CircleDashed } from 'lucide-react'
import { isResolvedStatus } from '@/lib/dementia/parse'
import type { ActionItem } from '@/lib/dementia/types'
import { cn } from '@/lib/utils'

export function ActionItemRow({ action }: { action: ActionItem }) {
  const resolved = isResolvedStatus(action.status)
  return (
    <div
      className={cn(
        'rounded-md border p-2.5 text-sm',
        resolved ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50',
      )}
    >
      <div className="flex items-start gap-2">
        {resolved ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
        ) : (
          <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {action.code && <span className="mr-1 text-muted-foreground">[{action.code}]</span>}
            {action.actionText}
            {action.org && <span className="ml-1 text-muted-foreground">({action.org})</span>}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
            <span className="text-muted-foreground">등록 {action.actionDate}</span>
            {action.dueDate && (
              <span className="flex items-center gap-1 font-medium text-gray-700">
                <CalendarClock className="h-3 w-3" /> 기한 {action.dueDate}
              </span>
            )}
            <span
              className={cn(
                'rounded px-1.5 py-0.5 font-semibold',
                resolved ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700',
              )}
            >
              {action.status || '미해결(공백)'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * record 본문 렌더. "# 제목" 줄은 소제목으로, 조치 아이템 줄은 ActionItemRow로.
 */
export function RecordBody({ record, actions }: { record: string; actions: ActionItem[] }) {
  const actionRaws = new Set(actions.map((a) => a.raw))
  const lines = (record ?? '').replace(/\r\n/g, '\n').split('\n')

  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const trimmed = line.trim()
        if (!trimmed) return <div key={i} className="h-1" />

        // 조치 아이템 줄
        const action = actions.find((a) => a.raw === trimmed)
        if (action && actionRaws.has(trimmed)) {
          return <ActionItemRow key={i} action={action} />
        }

        // 소제목 (# ...)
        if (trimmed.startsWith('#')) {
          return (
            <p key={i} className="pt-1.5 text-sm font-bold text-teal-800">
              {trimmed.replace(/^#+\s*/, '')}
            </p>
          )
        }

        return (
          <p key={i} className="whitespace-pre-wrap break-words text-sm text-gray-700">
            {line}
          </p>
        )
      })}
    </div>
  )
}
