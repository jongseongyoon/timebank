'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { Loader2, Save, CheckCircle } from 'lucide-react'

interface Config {
  key: string
  value: string
  updatedAt: string
  updatedBy: string
}

const CONFIG_META: Record<string, { label: string; description: string; type: string }> = {
  TC_RATE_BASE:         { label: '기본 TC 요율', description: '기본 서비스 TC/시간', type: 'number' },
  TC_RATE_EDUCATION:    { label: '교육 TC 요율', description: '교육 서비스 TC/시간', type: 'number' },
  TC_RATE_PROFESSIONAL: { label: '전문직 TC 요율', description: '전문직 서비스 TC/시간', type: 'number' },
  TC_RATE_ORG:          { label: '단체 TC 요율', description: '자생단체 할인 요율', type: 'number' },
  RESERVE_RATIO_WARN:   { label: '준비금 경보선 (%)', description: '이하일 때 경고 표시', type: 'number' },
  FREE_TC_MONTHLY:      { label: '취약계층 월 무상 TC', description: '매월 자동 지급 TC', type: 'number' },
  TC_EXPIRY_YEARS:      { label: 'TC 만료 기간 (년)', description: '일반 회원 TC 유효 기간', type: 'number' },
  TC_EXPIRY_SENIOR:     { label: '고령자 TC 만료 기간 (년)', description: '65세 이상 유효 기간', type: 'number' },
  PRIVATE_MARKET_MIN_TC:{ label: '민간시장 최소 TC 잔액', description: '민간시장 거래 자격 기준', type: 'number' },
  MAX_DAILY_TX:         { label: '일일 최대 거래 건수', description: '1인당 하루 거래 한도', type: 'number' },
}

export default function AdminSettingsPage() {
  const [configs, setConfigs] = useState<Config[]>([])
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d) => {
        setConfigs(d.configs ?? [])
        const vals: Record<string, string> = {}
        ;(d.configs ?? []).forEach((c: Config) => { vals[c.key] = c.value })
        setEditValues(vals)
        setLoading(false)
      })
  }, [])

  async function handleSave(key: string) {
    setSaving(key)
    const res = await fetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value: editValues[key] }),
    })
    if (res.ok) {
      const updated = await res.json()
      setConfigs((prev) => prev.map((c) => c.key === key ? updated.config : c))
      setSaved(key)
      setTimeout(() => setSaved(null), 2000)
    }
    setSaving(null)
  }

  const knownKeys = Object.keys(CONFIG_META)
  const knownConfigs = configs.filter((c) => knownKeys.includes(c.key))
  const unknownConfigs = configs.filter((c) => !knownKeys.includes(c.key))

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">시스템 설정</h1>
        <p className="text-muted-foreground text-sm mt-1">TC 요율 및 시스템 파라미터 관리</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">시스템 파라미터</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {knownKeys.map((key) => {
                const meta = CONFIG_META[key]
                const config = knownConfigs.find((c) => c.key === key)
                const val = editValues[key] ?? ''
                const isSaving = saving === key
                const isSaved = saved === key

                return (
                  <div key={key} className="flex items-start gap-4 py-3 border-b last:border-0">
                    <div className="flex-1 min-w-0">
                      <Label className="text-sm font-medium">{meta.label}</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">{meta.description}</p>
                      {config && (
                        <p className="text-xs text-muted-foreground mt-1">
                          마지막 수정: {formatDate(config.updatedAt)} · {config.updatedBy}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Input
                        type={meta.type}
                        value={val}
                        onChange={(e) => setEditValues((p) => ({ ...p, [key]: e.target.value }))}
                        className="w-28 h-8 text-sm"
                        step={meta.type === 'number' ? '0.01' : undefined}
                      />
                      <Button
                        size="sm"
                        variant={isSaved ? 'ghost' : 'outline'}
                        className="h-8 w-8 p-0"
                        onClick={() => handleSave(key)}
                        disabled={isSaving}
                        aria-label={`${meta.label} 저장`}
                      >
                        {isSaving
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : isSaved
                          ? <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                          : <Save className="h-3.5 w-3.5" />
                        }
                      </Button>
                    </div>
                  </div>
                )
              })}

              {knownConfigs.length === 0 && knownKeys.length > 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  설정값이 없습니다. DB에 SystemConfig 레코드를 추가하거나 저장 버튼으로 초기화하세요.
                </p>
              )}
            </CardContent>
          </Card>

          {unknownConfigs.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">기타 설정</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {unknownConfigs.map((c) => (
                  <div key={c.key} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium font-mono">{c.key}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(c.updatedAt)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        value={editValues[c.key] ?? c.value}
                        onChange={(e) => setEditValues((p) => ({ ...p, [c.key]: e.target.value }))}
                        className="w-36 h-8 text-sm"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={() => handleSave(c.key)}
                        disabled={saving === c.key}
                        aria-label={`${c.key} 저장`}
                      >
                        {saving === c.key
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : saved === c.key
                          ? <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                          : <Save className="h-3.5 w-3.5" />
                        }
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded-md px-4 py-3">
            <p className="font-medium text-amber-800 mb-1">⚠ 설정 변경 시 주의사항</p>
            <ul className="space-y-0.5 text-amber-700">
              <li>· TC 요율 변경은 신규 거래부터 적용되며 기존 거래에는 소급 적용되지 않습니다.</li>
              <li>· 준비금 경보선 변경은 즉시 반영됩니다.</li>
              <li>· 취약계층 무상 TC는 다음 자동 지급 시점부터 적용됩니다.</li>
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
