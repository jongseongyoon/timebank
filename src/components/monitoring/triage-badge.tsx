/**
 * 트리아지 색상 뱃지 (명령서 §6)
 * 숫자가 높을수록 위험 → 강한 경고색.
 * 0/공백=회색, 1=초록, 2=주황, 3+=적색
 */
import { cn } from '@/lib/utils'

export function triageStyle(triage: number): { label: string; className: string } {
  if (triage >= 3) return { label: `위험 ${triage}`, className: 'bg-red-100 text-red-800 border-red-200' }
  if (triage === 2) return { label: '중간 2', className: 'bg-orange-100 text-orange-800 border-orange-200' }
  if (triage === 1) return { label: '낮음 1', className: 'bg-green-100 text-green-800 border-green-200' }
  return { label: '미분류', className: 'bg-gray-100 text-gray-600 border-gray-200' }
}

export function TriageBadge({ triage, className }: { triage: number; className?: string }) {
  const s = triageStyle(triage)
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold',
        s.className,
        className,
      )}
    >
      {s.label}
    </span>
  )
}
