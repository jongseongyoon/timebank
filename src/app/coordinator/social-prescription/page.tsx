'use client'

import { useEffect, useState, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CheckCircle2, XCircle, RefreshCw, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import { SERVICE_CATEGORY_MAP as SERVICE_LABELS } from '@/lib/constants'

// ── 타입 ──────────────────────────────────────────────────────────────────────
interface Prescription {
  id:                  string
  prescriptionNo:      string
  status:              string
  careLevel:           number
  totalTpGranted:      string | number
  monthlyTpLimit:      string | number
  tpUsed:              string | number
  fundSource:          string
  prescriptionReason:  string[]
  recommendedServices: string[]
  validFrom:           string
  validUntil:          string
  approvedAt:          string | null
  note:                string | null
  receiver:   { id: string; name: string; dong: string }
  prescriber: { id: string; name: string }
  coordinator: { id: string; name: string } | null
  history:    Array<{ id: string; action: string; reason: string | null; performedBy: string; createdAt: string }>
}

// ── 유틸 ──────────────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  PENDING:   '대기',
  ACTIVE:    '활성',
  EXPIRED:   '만료',
  CANCELLED: '취소',
}
const STATUS_COLOR: Record<string, string> = {
  PENDING:   'bg-yellow-100 text-yellow-800',
  ACTIVE:    'bg-green-100 text-green-800',
  EXPIRED:   'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-700',
}
const REASON_LABELS: Record<string, string> = {
  고독고립: '고독·고립', 이동불편: '이동불편', 경제취약: '경제취약',
  건강악화: '건강악화', 인지저하: '인지저하', 기타: '기타',
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

// ── 처방전 카드 ───────────────────────────────────────────────────────────────
function PrescriptionCard({
  rx,
  onAction,
}: {
  rx: Prescription
  onAction: (id: string, action: 'approve' | 'renew' | 'cancel', extra?: any) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [renewDate, setRenewDate] = useState('')
  const [addTp, setAddTp] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [showRenew, setShowRenew] = useState(false)
  const [showCancel, setShowCancel] = useState(false)

  async function handle(action: 'approve' | 'renew' | 'cancel') {
    setBusy(true)
    try {
      await onAction(rx.id, action,
        action === 'renew'   ? { newValidUntil: renewDate, additionalTp: addTp ? Number(addTp) : undefined }
        : action === 'cancel' ? { reason: cancelReason || '코디네이터 취소' }
        : undefined
      )
    } finally {
      setBusy(false)
      setShowRenew(false)
      setShowCancel(false)
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 cursor-pointer select-none" onClick={() => setExpanded(v => !v)}>
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-gray-500">{rx.prescriptionNo}</span>
              <Badge className={`text-xs ${STATUS_COLOR[rx.status] ?? 'bg-gray-100 text-gray-600'}`}>
                {STATUS_LABEL[rx.status] ?? rx.status}
              </Badge>
              <Badge variant="outline" className="text-xs">돌봄 {rx.careLevel}등급</Badge>
            </div>
            <CardTitle className="text-base">
              {rx.receiver.name} <span className="font-normal text-gray-500">({rx.receiver.dong})</span>
            </CardTitle>
            <p className="text-xs text-gray-500">처방자: {rx.prescriber.name}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg font-bold text-indigo-700">{Number(rx.totalTpGranted)} TP</p>
            <p className="text-xs text-gray-400">월 {Number(rx.monthlyTpLimit)} TP</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
          <span>{fmtDate(rx.validFrom)} ~ {fmtDate(rx.validUntil)}</span>
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-4">
          {/* 처방 사유 & 권장 서비스 */}
          <div className="space-y-2 text-sm">
            <div>
              <p className="text-xs text-gray-400 mb-1">처방 사유</p>
              <div className="flex flex-wrap gap-1">
                {rx.prescriptionReason.map(r => (
                  <span key={r} className="bg-orange-50 text-orange-700 text-xs px-2 py-0.5 rounded-full">
                    {REASON_LABELS[r] ?? r}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">권장 서비스</p>
              <div className="flex flex-wrap gap-1">
                {rx.recommendedServices.map(s => (
                  <span key={s} className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                    {SERVICE_LABELS[s] ?? s}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* TP 사용 현황 */}
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>TP 사용</span>
              <span>{Number(rx.tpUsed)} / {Number(rx.totalTpGranted)} TP</span>
            </div>
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full"
                style={{ width: `${Math.min(Number(rx.tpUsed) / Math.max(Number(rx.totalTpGranted), 1) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              재원: {rx.fundSource === 'ADMIN' ? '⚠️ 관리자 발행 포함' : '✅ 기금'}
            </p>
          </div>

          {/* 메모 */}
          {rx.note && (
            <p className="text-xs text-gray-500 bg-yellow-50 border border-yellow-100 rounded-md p-2">
              💬 {rx.note}
            </p>
          )}

          {/* 이력 */}
          {rx.history.length > 0 && (
            <div className="text-xs space-y-1">
              <p className="text-gray-400 font-medium">이력</p>
              {rx.history.slice(0, 3).map(h => (
                <div key={h.id} className="flex gap-2 text-gray-500">
                  <span className="text-gray-300 shrink-0">{fmtDate(h.createdAt)}</span>
                  <span>{h.action}</span>
                  {h.reason && <span className="truncate">{h.reason}</span>}
                </div>
              ))}
            </div>
          )}

          {/* 액션 버튼 */}
          <div className="flex flex-wrap gap-2 pt-1">
            {rx.status === 'PENDING' && (
              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1"
                disabled={busy} onClick={() => handle('approve')}>
                {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                승인
              </Button>
            )}
            {(rx.status === 'ACTIVE' || rx.status === 'EXPIRED') && (
              <Button size="sm" variant="outline" className="gap-1"
                disabled={busy} onClick={() => setShowRenew(v => !v)}>
                <RefreshCw className="h-3 w-3" />
                갱신
              </Button>
            )}
            {rx.status !== 'CANCELLED' && (
              <Button size="sm" variant="outline" className="text-red-600 border-red-200 gap-1"
                disabled={busy} onClick={() => setShowCancel(v => !v)}>
                <XCircle className="h-3 w-3" />
                취소
              </Button>
            )}
          </div>

          {/* 갱신 폼 */}
          {showRenew && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-blue-800">갱신 정보 입력</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500">새 만료일 *</label>
                  <input type="date" value={renewDate} onChange={e => setRenewDate(e.target.value)}
                    className="w-full text-sm border rounded-md px-2 py-1 mt-0.5" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">추가 TP (선택)</label>
                  <input type="number" step="0.5" min="0" value={addTp} onChange={e => setAddTp(e.target.value)}
                    placeholder="0" className="w-full text-sm border rounded-md px-2 py-1 mt-0.5" />
                </div>
              </div>
              <Button size="sm" disabled={busy || !renewDate} onClick={() => handle('renew')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                {busy ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                갱신 확인
              </Button>
            </div>
          )}

          {/* 취소 폼 */}
          {showCancel && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-red-800">취소 사유</p>
              <input type="text" value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                placeholder="취소 사유를 입력하세요"
                className="w-full text-sm border rounded-md px-2 py-1" />
              <Button size="sm" variant="destructive" className="w-full"
                disabled={busy} onClick={() => handle('cancel')}>
                {busy ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                취소 확인
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────
export default function SocialPrescriptionPage() {
  const [items, setItems] = useState<Prescription[]>([])
  const [statusFilter, setStatusFilter] = useState('PENDING')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  function showToast(msg: string, type: 'ok' | 'err') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async (status: string, p: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/social-prescription?status=${status}&page=${p}`)
      const data = await res.json()
      // 각 처방전의 이력까지 가져오기 위해 단건 API 재호출은 비용이 크므로
      // 목록 API가 history 포함하지 않으면 별도로 처리하지 않음
      setItems(data.items ?? [])
      setTotalPages(data.totalPages ?? 1)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(statusFilter, page) }, [load, statusFilter, page])

  async function handleAction(id: string, action: 'approve' | 'renew' | 'cancel', extra?: any) {
    try {
      const res = await fetch(`/api/social-prescription/${id}?action=${action}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(extra ?? {}),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error ?? '처리 실패', 'err')
        return
      }
      const label = action === 'approve' ? '승인' : action === 'renew' ? '갱신' : '취소'
      showToast(`${label} 완료 (${data.prescription?.prescriptionNo})`, 'ok')
      // 목록 새로고침
      await load(statusFilter, page)
    } catch {
      showToast('네트워크 오류', 'err')
    }
  }

  const TABS = ['PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED'] as const

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* 헤더 */}
      <div>
        <h1 className="text-xl font-bold">사회적처방 관리</h1>
        <p className="text-sm text-muted-foreground mt-0.5">처방전 승인·갱신·취소를 처리합니다</p>
      </div>

      {/* 토스트 */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg text-white text-sm flex items-center gap-2
          ${toast.type === 'ok' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.type === 'ok' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      {/* 탭 필터 */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {TABS.map(t => (
          <button key={t}
            onClick={() => { setStatusFilter(t); setPage(1) }}
            className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors
              ${statusFilter === t ? 'bg-white shadow text-indigo-700' : 'text-gray-500'}`}>
            {STATUS_LABEL[t]}
          </button>
        ))}
      </div>

      {/* 목록 */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">{STATUS_LABEL[statusFilter]} 상태의 처방전이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(rx => (
            <PrescriptionCard key={rx.id} rx={rx} onAction={handleAction} />
          ))}
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            이전
          </Button>
          <span className="text-gray-500">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
            다음
          </Button>
        </div>
      )}
    </div>
  )
}
