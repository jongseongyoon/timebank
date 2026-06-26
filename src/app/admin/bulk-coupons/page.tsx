'use client'

import { useRef, useState } from 'react'
import { Upload, Download, CheckCircle, XCircle, AlertCircle, Gift } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Row = { phone: string; name: string; cashAmount: number; validDays: number; reason: string }
type Result = { phone: string; name: string; cashAmount: number; status: 'success' | 'error'; reason: string }

export default function BulkCouponsPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<Row[]>([])
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setResults([])

    const XLSX = await import('xlsx')
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf, { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 })

    // 첫 행은 헤더 (전화번호|이름|금액(원)|유효일수|사유)
    const rows: Row[] = raw.slice(1)
      .filter(r => r[0] && r[2])
      .map(r => ({
        phone: String(r[0]).trim(),
        name: String(r[1] ?? '').trim(),
        cashAmount: Number(r[2]),
        validDays: Number(r[3]) > 0 ? Number(r[3]) : 365,
        reason: String(r[4] ?? '일괄 발급').trim(),
      }))
      .filter(r => r.cashAmount > 0)

    setPreview(rows)
  }

  async function handleProcess() {
    if (preview.length === 0) return
    setLoading(true)
    const res = await fetch('/api/admin/bulk-coupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: preview }),
    })
    const d = await res.json()
    setLoading(false)
    if (!res.ok) { setError(d.error); return }
    setResults(d.results)
    setPreview([])
  }

  function downloadTemplate() {
    import('xlsx').then(XLSX => {
      const ws = XLSX.utils.aoa_to_sheet([
        ['전화번호', '이름', '금액(원)', '유효일수', '사유'],
        ['010-1234-5678', '홍길동', 100000, 365, '사회적처방 지원'],
        ['010-9876-5432', '김철수', 50000, 180, '저소득 가구 지원'],
      ])
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '일괄발급')
      XLSX.writeFile(wb, 'goodcoupon_bulk_template.xlsx')
    })
  }

  function downloadResults() {
    import('xlsx').then(XLSX => {
      const ws = XLSX.utils.aoa_to_sheet([
        ['전화번호', '이름', '금액(원)', '결과(쿠폰번호/오류)'],
        ...results.map(r => [r.phone, r.name, r.cashAmount, r.status === 'success' ? `✓ ${r.reason}` : `✗ ${r.reason}`]),
      ])
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '처리결과')
      XLSX.writeFile(wb, 'goodcoupon_bulk_result.xlsx')
    })
  }

  const successCount = results.filter(r => r.status === 'success').length
  const errorCount = results.filter(r => r.status === 'error').length

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Gift className="h-6 w-6 text-orange-600" /> 엑셀 일괄 발급 (착한쿠폰)
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          엑셀로 여러 회원에게 착한쿠폰(원화)을 한 번에 발급합니다. 회원에게는 원화 금액만 표시됩니다.
        </p>
      </div>

      {/* 업로드 영역 */}
      <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-8 text-center space-y-3">
        <Upload className="h-10 w-10 text-gray-400 mx-auto" />
        <p className="text-sm text-gray-600">엑셀 파일을 업로드하세요 (.xlsx)</p>
        <p className="text-xs text-gray-400">형식: 전화번호 | 이름 | 금액(원) | 유효일수 | 사유</p>
        <div className="flex justify-center gap-3">
          <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-1">
            <Download className="h-4 w-4" /> 템플릿 다운로드
          </Button>
          <Button size="sm" onClick={() => fileRef.current?.click()} className="gap-1 bg-orange-600 hover:bg-orange-700">
            <Upload className="h-4 w-4" /> 파일 선택
          </Button>
        </div>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
      </div>

      {/* 미리보기 */}
      {preview.length > 0 && (
        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <h3 className="font-semibold">미리보기 — {preview.length}건 · 합계 {preview.reduce((a, r) => a + r.cashAmount, 0).toLocaleString('ko-KR')}원</h3>
            <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 px-3 py-1 rounded-full">
              <AlertCircle className="h-4 w-4" /> 처리 전 내용을 확인하세요
            </div>
          </div>
          <div className="overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left">#</th>
                  <th className="px-4 py-2 text-left">전화번호</th>
                  <th className="px-4 py-2 text-left">이름</th>
                  <th className="px-4 py-2 text-right">금액(원)</th>
                  <th className="px-4 py-2 text-right">유효일</th>
                  <th className="px-4 py-2 text-left">사유</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {preview.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                    <td className="px-4 py-2">{r.phone}</td>
                    <td className="px-4 py-2 font-medium">{r.name}</td>
                    <td className="px-4 py-2 text-right font-bold text-orange-700">{r.cashAmount.toLocaleString('ko-KR')}</td>
                    <td className="px-4 py-2 text-right text-gray-500">{r.validDays}일</td>
                    <td className="px-4 py-2 text-gray-500 max-w-[180px] truncate">{r.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {error && <p className="text-sm text-red-500 px-4 py-2">{error}</p>}
          <div className="px-4 py-3 border-t flex justify-end">
            <Button onClick={handleProcess} disabled={loading} className="gap-2 bg-orange-600 hover:bg-orange-700">
              {loading ? '처리 중...' : `${preview.length}건 일괄 발급`}
            </Button>
          </div>
        </div>
      )}

      {/* 처리 결과 */}
      {results.length > 0 && (
        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1 text-green-700 text-sm font-medium">
                <CheckCircle className="h-4 w-4" /> 성공 {successCount}건
              </span>
              {errorCount > 0 && (
                <span className="flex items-center gap-1 text-red-600 text-sm font-medium">
                  <XCircle className="h-4 w-4" /> 실패 {errorCount}건
                </span>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={downloadResults} className="gap-1">
              <Download className="h-4 w-4" /> 결과 다운로드
            </Button>
          </div>
          <div className="overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-2 text-left">전화번호</th>
                  <th className="px-4 py-2 text-left">이름</th>
                  <th className="px-4 py-2 text-right">금액(원)</th>
                  <th className="px-4 py-2 text-left">결과</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {results.map((r, i) => (
                  <tr key={i} className={r.status === 'error' ? 'bg-red-50' : ''}>
                    <td className="px-4 py-2">{r.phone}</td>
                    <td className="px-4 py-2 font-medium">{r.name}</td>
                    <td className="px-4 py-2 text-right">{r.cashAmount.toLocaleString('ko-KR')}</td>
                    <td className="px-4 py-2">
                      {r.status === 'success'
                        ? <span className="text-green-600 font-medium">✓ {r.reason}</span>
                        : <span className="text-red-600">✗ {r.reason}</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
