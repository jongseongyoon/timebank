'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Upload, Loader2, CheckCircle2, AlertTriangle, FileSpreadsheet } from 'lucide-react'
import { importMembers, type ImportRow, type ImportResult } from '@/app/tomato/import/actions'

// 시스템 필드 정의 + 헤더 자동매칭 키워드
const FIELDS = [
  { key: 'name', label: '이름', required: true, kw: ['이름', '성명', '회원명', 'name'] },
  { key: 'memberNo', label: '회원번호', kw: ['회원번호', '회원no', 'memberno', '회원코드', '회원 번호'] },
  { key: 'phone', label: '전화번호', kw: ['전화', '휴대', '연락', '핸드', 'phone', 'mobile', 'hp', '폰'] },
  { key: 'address', label: '주소', kw: ['주소', 'address', '거주'] },
  { key: 'birthDate', label: '생년월일', kw: ['생년', '생일', 'birth'] },
  { key: 'memo', label: '메모', kw: ['메모', '비고', 'memo', 'note'] },
] as const

type FieldKey = (typeof FIELDS)[number]['key']
type Mapping = Record<FieldKey, number> // 헤더 인덱스, -1 = 없음

function norm(s: string) {
  return s.toString().toLowerCase().replace(/\s/g, '')
}

function guessMapping(headers: string[]): Mapping {
  const m = {} as Mapping
  for (const f of FIELDS) {
    m[f.key] = headers.findIndex((h) => f.kw.some((k) => norm(h).includes(norm(k))))
  }
  return m
}

export function MemberImport() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<Mapping | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState('')

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setResult(null)
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const aoa = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, raw: false, defval: '', blankrows: false })
      if (!aoa.length) {
        setError('빈 파일입니다.')
        return
      }
      const hdr = (aoa[0] as any[]).map((c) => (c ?? '').toString())
      const body = (aoa.slice(1) as any[][]).map((r) => hdr.map((_, i) => (r[i] ?? '').toString()))
      setFileName(file.name)
      setHeaders(hdr)
      setRows(body)
      setMapping(guessMapping(hdr))
    } catch {
      setError('엑셀(.xlsx) 파일을 읽지 못했습니다.')
    }
  }

  // 매핑 적용된 미리보기 행 + 검증
  const preview = useMemo(() => {
    if (!mapping) return []
    return rows.map((r, i) => {
      const get = (k: FieldKey) => (mapping[k] >= 0 ? (r[mapping[k]] ?? '').trim() : '')
      const name = get('name')
      return {
        rowIndex: i + 2, // 헤더가 1행
        name,
        memberNo: get('memberNo'),
        phone: get('phone'),
        address: get('address'),
        birthDate: get('birthDate'),
        memo: get('memo'),
        invalid: !name,
      }
    })
  }, [rows, mapping])

  const validCount = preview.filter((p) => !p.invalid).length
  const invalidCount = preview.length - validCount
  const nameMapped = mapping ? mapping.name >= 0 : false

  function submit() {
    setError('')
    const payload: ImportRow[] = preview.map((p) => ({
      rowIndex: p.rowIndex,
      name: p.name,
      memberNo: p.memberNo,
      phone: p.phone,
      address: p.address,
      birthDate: p.birthDate,
      memo: p.memo,
    }))
    startTransition(async () => {
      try {
        const res = await importMembers(payload)
        setResult(res)
        router.refresh()
      } catch {
        setError('등록 처리 중 오류가 발생했습니다.')
      }
    })
  }

  return (
    <div className="space-y-5">
      {error && (
        <p role="alert" className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
      )}

      {/* 1. 파일 업로드 */}
      <Card>
        <CardContent className="pt-5">
          <p className="font-semibold text-sm mb-3 flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-red-600" aria-hidden="true" /> 1. 엑셀 파일 선택 (.xlsx)
          </p>
          <label className="inline-flex items-center gap-2 cursor-pointer rounded-md border border-dashed px-4 py-3 text-sm hover:bg-accent">
            <Upload className="h-4 w-4" aria-hidden="true" />
            {fileName || '파일 선택…'}
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={onFile} />
          </label>
          {rows.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2">총 {rows.length}행 읽음 · 첫 행을 헤더로 사용</p>
          )}
        </CardContent>
      </Card>

      {/* 2. 컬럼 매핑 */}
      {mapping && (
        <Card>
          <CardContent className="pt-5">
            <p className="font-semibold text-sm mb-3">2. 컬럼 매핑</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {FIELDS.map((f) => (
                <div key={f.key} className="flex items-center gap-2">
                  <span className="text-sm w-24 shrink-0">
                    {f.label}{'required' in f && f.required && <span className="text-red-600"> *</span>}
                  </span>
                  <select
                    value={mapping[f.key]}
                    onChange={(e) => setMapping({ ...mapping, [f.key]: Number(e.target.value) })}
                    className="flex-1 h-9 rounded-md border px-2 text-sm bg-white"
                  >
                    <option value={-1}>(없음)</option>
                    {headers.map((h, i) => (
                      <option key={i} value={i}>{h || `열 ${i + 1}`}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            {!nameMapped && (
              <p className="text-xs text-red-600 mt-2">이름 컬럼을 반드시 지정하세요.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* 3. 미리보기 + 검증 */}
      {mapping && preview.length > 0 && (
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-sm">3. 미리보기 (상위 20행)</p>
              <div className="flex gap-2 text-xs">
                <Badge variant="success">정상 {validCount}</Badge>
                {invalidCount > 0 && <Badge variant="destructive">오류 {invalidCount}</Badge>}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-1.5 pr-3">행</th>
                    <th className="py-1.5 pr-3">이름</th>
                    <th className="py-1.5 pr-3">회원번호</th>
                    <th className="py-1.5 pr-3">전화</th>
                    <th className="py-1.5 pr-3">주소</th>
                    <th className="py-1.5 pr-3">생년월일</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 20).map((p) => (
                    <tr key={p.rowIndex} className={'border-b ' + (p.invalid ? 'bg-red-50' : '')}>
                      <td className="py-1.5 pr-3 text-muted-foreground">{p.rowIndex}</td>
                      <td className="py-1.5 pr-3">
                        {p.name || <span className="text-red-600">(이름 없음)</span>}
                      </td>
                      <td className="py-1.5 pr-3">{p.memberNo}</td>
                      <td className="py-1.5 pr-3">{p.phone}</td>
                      <td className="py-1.5 pr-3 max-w-[200px] truncate">{p.address}</td>
                      <td className="py-1.5 pr-3">{p.birthDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Button onClick={submit} disabled={pending || !nameMapped || validCount === 0}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {validCount}건 등록 실행
              </Button>
              <span className="text-xs text-muted-foreground">
                회원번호가 있으면 갱신, 없으면 신규로 등록됩니다. 오류 행(이름 없음)은 제외됩니다.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4. 결과 */}
      {result && (
        <Card className="border-red-200">
          <CardContent className="pt-5">
            <p className="font-semibold text-sm mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-red-600" aria-hidden="true" /> 등록 완료
            </p>
            <div className="flex flex-wrap gap-3 text-sm">
              <Badge variant="success">신규 {result.newCount}</Badge>
              <Badge variant="secondary">갱신 {result.updateCount}</Badge>
              {result.errorCount > 0 && <Badge variant="destructive">오류 {result.errorCount}</Badge>}
            </div>
            {result.errors.length > 0 && (
              <div className="mt-3 text-xs">
                <p className="flex items-center gap-1 text-red-600 font-medium mb-1">
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" /> 오류 행
                </p>
                <ul className="space-y-0.5 max-h-48 overflow-y-auto">
                  {result.errors.map((er, i) => (
                    <li key={i} className="text-muted-foreground">
                      {er.rowIndex}행 {er.name && `(${er.name})`} — {er.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
