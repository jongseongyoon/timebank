'use client'

import { useRef, useState, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Download, Upload, Eye, Play, Loader2,
  CheckCircle2, AlertTriangle, XCircle, RefreshCw,
} from 'lucide-react'

// ── 엑셀 양식 헤더
const HEADERS = ['가게명', '사장님명', '전화번호', '주소', '동', '업종', '은행명', '계좌번호', '예금주', '등록상태']

interface PreviewRow {
  rowIndex: number
  storeName: string
  phone: string
  dong: string
  ownerName: string
  statusCode: 'ok' | 'warn' | 'error' | 'duplicate'
  message: string
}

interface Counts { ok: number; warn: number; error: number; duplicate: number }

interface Batch {
  id: string
  createdAt: string
  totalRows: number
  successCount: number
  errorCount: number
  duplicateCount: number
  importer: { name: string }
  sourceFile: string | null
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  ok:        <CheckCircle2 className="h-4 w-4 text-green-600" />,
  warn:      <AlertTriangle className="h-4 w-4 text-yellow-500" />,
  error:     <XCircle className="h-4 w-4 text-red-500" />,
  duplicate: <RefreshCw className="h-4 w-4 text-gray-400" />,
}
const STATUS_LABEL: Record<string, string> = {
  ok: '정상', warn: '계좌확인', error: '오류', duplicate: '중복',
}
const STATUS_COLOR: Record<string, string> = {
  ok:        'bg-green-50 text-green-700',
  warn:      'bg-yellow-50 text-yellow-700',
  error:     'bg-red-50 text-red-700',
  duplicate: 'bg-gray-100 text-gray-500',
}

const PAGE_SIZE = 50

export default function StoreImportPage() {
  const fileRef       = useRef<HTMLInputElement>(null)
  const [csvText, setCsvText]       = useState('')
  const [fileName, setFileName]     = useState('')
  const [preview, setPreview]       = useState<PreviewRow[]>([])
  const [counts, setCounts]         = useState<Counts | null>(null)
  const [total, setTotal]           = useState(0)
  const [previewing, setPreviewing] = useState(false)
  const [executing, setExecuting]   = useState(false)
  const [result, setResult]         = useState<{ success: number; error: number; duplicate: number; errors: string[] } | null>(null)
  const [batches, setBatches]       = useState<Batch[]>([])
  const [batchLoaded, setBatchLoaded] = useState(false)
  const [page, setPage]             = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // ── 엑셀 양식 다운로드
  function downloadTemplate() {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([HEADERS, ['화정마트', '김철수', '010-1234-5678', '광주 서구 화정로 1', '화정3동', '마트', '국민은행', '123456789012', '김철수', '']])
    XLSX.utils.book_append_sheet(wb, ws, '착한가게등록')
    XLSX.writeFile(wb, '착한가게_일괄등록_양식.xlsx')
  }

  // ── 파일 선택 → CSV 변환
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = ev => {
      const ab = ev.target?.result as ArrayBuffer
      const wb = XLSX.read(ab, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const csv = XLSX.utils.sheet_to_csv(ws)
      setCsvText(csv)
      setPreview([])
      setCounts(null)
      setResult(null)
      setPage(1)
    }
    reader.readAsArrayBuffer(file)
  }

  // ── 미리보기
  const handlePreview = useCallback(async () => {
    if (!csvText) return
    setPreviewing(true)
    try {
      const res  = await fetch('/api/admin/store-import/preview', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText }),
      })
      const data = await res.json()
      setPreview(data.preview ?? [])
      setCounts(data.counts)
      setTotal(data.total ?? 0)
      setPage(1)
    } finally { setPreviewing(false) }
  }, [csvText])

  // ── 등록 실행
  async function handleExecute(skipWarnings: boolean) {
    if (!csvText) return
    if (!confirm(`${skipWarnings ? '⚠️ 계좌확인 건 제외 후 ' : ''}등록을 진행합니다. 계속하시겠습니까?`)) return
    setExecuting(true)
    setResult(null)
    try {
      const res  = await fetch('/api/admin/store-import/execute', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText, skipWarnings }),
      })
      const data = await res.json()
      setResult(data.results)
    } finally { setExecuting(false) }
  }

  // ── 이력 불러오기
  async function loadBatches() {
    const res  = await fetch('/api/admin/store-import/batches')
    const data = await res.json()
    setBatches(data.batches ?? [])
    setBatchLoaded(true)
  }

  // ── 필터된 미리보기
  const filtered = statusFilter === 'all' ? preview : preview.filter(r => r.statusCode === statusFilter)
  const paged    = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      <div>
        <h1 className="text-2xl font-bold">착한가게 일괄 등록</h1>
        <p className="text-sm text-muted-foreground mt-1">1,700여 개 착한가게를 엑셀로 일괄 등록합니다</p>
      </div>

      {/* ── 1. 엑셀 양식 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">1. 엑셀 양식 다운로드</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-3">
            컬럼: 가게명 · 사장님명 · 전화번호 · 주소 · 동 · 업종 · 은행명 · 계좌번호 · 예금주 · 등록상태
          </p>
          <Button variant="outline" onClick={downloadTemplate} className="gap-2">
            <Download className="h-4 w-4" /> 엑셀 양식 다운로드
          </Button>
        </CardContent>
      </Card>

      {/* ── 2. 파일 업로드 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">2. 엑셀 업로드</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <input ref={fileRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={handleFile} />
            <Button variant="outline" onClick={() => fileRef.current?.click()} className="gap-2">
              <Upload className="h-4 w-4" /> 파일 선택
            </Button>
            {fileName && <span className="text-sm text-gray-600">{fileName}</span>}
          </div>
          {csvText && (
            <Button onClick={handlePreview} disabled={previewing} className="gap-2">
              {previewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
              미리보기
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ── 3. 미리보기 결과 */}
      {counts && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">3. 미리보기 결과 — 전체 {total}건</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 통계 뱃지 */}
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="flex items-center gap-1.5 text-green-700">
                <CheckCircle2 className="h-4 w-4" /> ✅ 정상: <strong>{counts.ok}</strong>건
              </span>
              <span className="flex items-center gap-1.5 text-yellow-600">
                <AlertTriangle className="h-4 w-4" /> ⚠️ 계좌확인: <strong>{counts.warn}</strong>건
              </span>
              <span className="flex items-center gap-1.5 text-red-600">
                <XCircle className="h-4 w-4" /> ❌ 오류: <strong>{counts.error}</strong>건
              </span>
              <span className="flex items-center gap-1.5 text-gray-500">
                <RefreshCw className="h-4 w-4" /> 🔁 중복: <strong>{counts.duplicate}</strong>건
              </span>
            </div>

            {/* 필터 탭 */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
              {(['all','ok','warn','error','duplicate'] as const).map(f => (
                <button key={f}
                  onClick={() => { setStatusFilter(f); setPage(1) }}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-colors
                    ${statusFilter === f ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>
                  {f === 'all' ? '전체' : STATUS_LABEL[f]}
                </button>
              ))}
            </div>

            {/* 테이블 */}
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 w-12">행</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">가게명</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500">전화번호</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 w-20">동</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 w-28">상태</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paged.map(row => (
                    <tr key={row.rowIndex} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-400 font-mono text-xs">{row.rowIndex}</td>
                      <td className="px-3 py-2 font-medium">{row.storeName}</td>
                      <td className="px-3 py-2 font-mono text-xs">{row.phone}</td>
                      <td className="px-3 py-2 text-xs">{row.dong}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-start gap-1">
                          {STATUS_ICON[row.statusCode]}
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${STATUS_COLOR[row.statusCode]}`}>
                            {row.message.length > 30 ? row.message.slice(0, 30) + '…' : row.message}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 text-sm">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>이전</Button>
                <span className="text-gray-500">{page} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>다음</Button>
              </div>
            )}

            {/* 등록 버튼 */}
            <div className="flex flex-wrap gap-3 pt-2 border-t">
              <Button
                onClick={() => handleExecute(false)}
                disabled={executing || counts.ok + counts.warn === 0}
                className="gap-2 bg-green-600 hover:bg-green-700 text-white">
                {executing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                오류 제외 일괄 등록하기 ({counts.ok + counts.warn}건)
              </Button>
              {counts.warn > 0 && (
                <Button
                  variant="outline"
                  onClick={() => handleExecute(true)}
                  disabled={executing || counts.ok === 0}
                  className="gap-2 border-yellow-300 text-yellow-700 hover:bg-yellow-50">
                  ⚠️ 계좌확인 건 보류, 정상만 등록 ({counts.ok}건)
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── 4. 처리 결과 */}
      {result && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-4">
            <p className="font-semibold text-green-800 mb-2">✅ 등록 완료</p>
            <div className="flex gap-4 text-sm">
              <span className="text-green-700">성공: <strong>{result.success}</strong>건</span>
              <span className="text-red-600">오류: <strong>{result.error}</strong>건</span>
              <span className="text-gray-500">중복: <strong>{result.duplicate}</strong>건</span>
            </div>
            {result.errors.length > 0 && (
              <details className="mt-3">
                <summary className="text-xs text-red-600 cursor-pointer">오류 상세 보기 ({result.errors.length}건)</summary>
                <ul className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                  {result.errors.map((e, i) => (
                    <li key={i} className="text-xs text-red-600 font-mono">{e}</li>
                  ))}
                </ul>
              </details>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── 5. 등록 이력 */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">5. 등록 이력</CardTitle>
          <Button variant="outline" size="sm" onClick={loadBatches}>
            {batchLoaded ? '새로고침' : '이력 불러오기'}
          </Button>
        </CardHeader>
        {batchLoaded && (
          <CardContent>
            {batches.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">등록 이력이 없습니다.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">등록일</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-500">담당자</th>
                      <th className="px-3 py-2 text-center font-medium text-gray-500">총건수</th>
                      <th className="px-3 py-2 text-center font-medium text-gray-500 text-green-600">성공</th>
                      <th className="px-3 py-2 text-center font-medium text-gray-500 text-red-500">오류</th>
                      <th className="px-3 py-2 text-center font-medium text-gray-500">중복</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {batches.map(b => (
                      <tr key={b.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-xs text-gray-500">
                          {new Date(b.createdAt).toLocaleDateString('ko-KR')}
                        </td>
                        <td className="px-3 py-2">{b.importer.name}</td>
                        <td className="px-3 py-2 text-center">{b.totalRows}</td>
                        <td className="px-3 py-2 text-center text-green-700 font-medium">{b.successCount}</td>
                        <td className="px-3 py-2 text-center text-red-600">{b.errorCount}</td>
                        <td className="px-3 py-2 text-center text-gray-400">{b.duplicateCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  )
}
