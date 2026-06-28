'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Plus, Save, Loader2, Eye, EyeOff } from 'lucide-react'
import { createCategory, updateCategory, toggleCategory, type ActionResult } from '@/app/tomato/categories/actions'

export type Category = {
  id: string
  name: string
  managementYears: number
  pointPercent: number // % 단위(예: 2)
  active: boolean
}

function pct(n: number) {
  // 소수점 불필요한 표시 정리 (2 / 2.5)
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

export function CategoryManager({ categories }: { categories: Category[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')

  // 신규 추가 폼
  const [newName, setNewName] = useState('')
  const [newYears, setNewYears] = useState('6')
  const [newPct, setNewPct] = useState('2')

  // 행 단위 수정값 (id -> {name, years, pct})
  const [edits, setEdits] = useState<Record<string, { name: string; years: string; pct: string }>>({})

  function run(fn: () => Promise<ActionResult>, onOk?: () => void) {
    setError('')
    startTransition(async () => {
      const res = await fn()
      if ('error' in res) setError(res.error)
      else {
        onOk?.()
        router.refresh()
      }
    })
  }

  function editVal(c: Category) {
    return edits[c.id] ?? { name: c.name, years: String(c.managementYears), pct: pct(c.pointPercent) }
  }
  function setEdit(id: string, patch: Partial<{ name: string; years: string; pct: string }>) {
    setEdits((prev) => ({ ...prev, [id]: { ...(prev[id] ?? { name: '', years: '', pct: '' }), ...patch } }))
  }

  return (
    <div className="space-y-5">
      {error && (
        <p role="alert" className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {/* 신규 추가 */}
      <Card>
        <CardContent className="pt-5">
          <p className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Plus className="h-4 w-4 text-red-600" aria-hidden="true" /> 새 제품 카테고리
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">제품 종류</label>
              <Input
                value={newName} onChange={(e) => setNewName(e.target.value)}
                placeholder="예: 보행보조기" className="w-44"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">관리연수(년)</label>
              <Input
                type="number" inputMode="numeric" value={newYears}
                onChange={(e) => setNewYears(e.target.value)} className="w-28"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">적립률(%)</label>
              <Input
                type="number" inputMode="decimal" step="0.5" value={newPct}
                onChange={(e) => setNewPct(e.target.value)} className="w-24"
              />
            </div>
            <Button
              disabled={pending}
              onClick={() =>
                run(
                  () => createCategory({ name: newName, managementYears: newYears, pointPercent: newPct }),
                  () => { setNewName(''); setNewYears('6'); setNewPct('2') }
                )
              }
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              추가
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 목록 */}
      <Card>
        <CardContent className="pt-5">
          <p className="font-semibold text-sm mb-3">등록된 카테고리 ({categories.length})</p>
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">아직 카테고리가 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {categories.map((c) => {
                const v = editVal(c)
                return (
                  <div
                    key={c.id}
                    className="flex flex-wrap items-end gap-3 rounded-md border px-3 py-3"
                    style={{ opacity: c.active ? 1 : 0.55 }}
                  >
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">제품 종류</label>
                      <Input value={v.name} onChange={(e) => setEdit(c.id, { name: e.target.value })} className="w-44" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">관리연수(년)</label>
                      <Input type="number" value={v.years} onChange={(e) => setEdit(c.id, { years: e.target.value })} className="w-28" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">적립률(%)</label>
                      <Input type="number" step="0.5" value={v.pct} onChange={(e) => setEdit(c.id, { pct: e.target.value })} className="w-24" />
                    </div>
                    <div className="flex items-center gap-2">
                      {!c.active && <Badge variant="secondary">비활성</Badge>}
                      <Button
                        variant="outline" size="sm" disabled={pending}
                        onClick={() =>
                          run(() =>
                            updateCategory({ id: c.id, name: v.name, managementYears: v.years, pointPercent: v.pct })
                          )
                        }
                      >
                        <Save className="h-4 w-4" /> 저장
                      </Button>
                      <Button
                        variant="ghost" size="sm" disabled={pending}
                        onClick={() => run(() => toggleCategory(c.id, !c.active))}
                        title={c.active ? '비활성화' : '활성화'}
                      >
                        {c.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        {c.active ? '비활성화' : '활성화'}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
