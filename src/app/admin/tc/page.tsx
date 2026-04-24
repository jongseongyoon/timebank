'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Loader2, Coins, Search, CheckCircle, XCircle, AlertTriangle, RotateCcw } from 'lucide-react'
import { formatDate } from '@/lib/utils'

const TX_TYPE_LABEL: Record<string, string> = {
  FREE_ALLOCATION: '무상배분',
  COMMUNITY_BONUS: '공동체 보너스',
  WAGE_SUPPLEMENT: '임금 보전',
  COMMUNITY_FUND_GIFT: '기금 증여',
  PEER_TO_PEER: 'P2P 교환',
  PUBLIC_SERVICE: '공공서비스',
  PRIVATE_MARKET: '민간시장',
  INDIVIDUAL_TO_ORG: '개인→단체',
  ORG_TO_INDIVIDUAL: '단체→개인',
  EXPIRY_DONATION: '만료 기부',
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
  DISPUTED: 'bg-red-100 text-red-700',
  RESOLVED: 'bg-blue-100 text-blue-700',
}
const STATUS_LABEL: Record<string, string> = {
  PENDING: '대기', APPROVED: '승인', CANCELLED: '취소', DISPUTED: '분쟁', RESOLVED: '해결',
}

export default function AdminTCPage() {
  // ── 발행 탭 ──
  const [members, setMembers] = useState<any[]>([])
  const [memberSearch, setMemberSearch] = useState('')
  const [selectedMember, setSelectedMember] = useState<any>(null)
  const [issueForm, setIssueForm] = useState({
    tcAmount: '', txType: 'FREE_ALLOCATION', note: '', durationMinutes: '0',
  })
  const [issuing, setIssuing] = useState(false)
  const [issueResult, setIssueResult] = useState<{ ok: boolean; msg: string } | null>(null)

  // ── 수정 탭 ──
  const [txList, setTxList] = useState<any[]>([])
  const [txLoading, setTxLoading] = useState(false)
  const [txStatus, setTxStatus] = useState('')
  const [txSearch, setTxSearch] = useState('')
  const [correcting, setCorrecting] = useState<string | null>(null)
  const [correctNote, setCorrectNote] = useState('')

  useEffect(() => {
    fetch('/api/coordinator/members')
      .then(r => r.json())
      .then(d => setMembers(d.members ?? []))
  }, [])

  useEffect(() => {
    setTxLoading(true)
    const p = new URLSearchParams()
    if (txStatus) p.set('status', txStatus)
    fetch(`/api/admin/tc?${p}`)
      .then(r => r.json())
      .then(d => { setTxList(d.transactions ?? []); setTxLoading(false) })
  }, [txStatus])

  const filteredMembers = members.filter(m =>
    !memberSearch || m.name.includes(memberSearch) || m.phone.includes(memberSearch)
  )

  const filteredTx = txList.filter(tx =>
    !txSearch || tx.provider?.name?.includes(txSearch) || tx.receiver?.name?.includes(txSearch)
      || tx.note?.includes(txSearch)
  )

  async function handleIssue() {
    if (!selectedMember || !issueForm.tcAmount || !issueForm.note) return
    setIssuing(true)
    setIssueResult(null)
    const res = await fetch('/api/admin/tc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memberId: selectedMember.id,
        tcAmount: Number(issueForm.tcAmount),
        txType: issueForm.txType,
        note: issueForm.note,
        durationMinutes: Number(issueForm.durationMinutes),
      }),
    })
    if (res.ok) {
      setIssueResult({ ok: true, msg: `${selectedMember.name}에게 ${issueForm.tcAmount} TC 발행 완료` })
      setIssueForm({ tcAmount: '', txType: 'FREE_ALLOCATION', note: '', durationMinutes: '0' })
      setSelectedMember(null)
    } else {
      const d = await res.json()
      setIssueResult({ ok: false, msg: d.error ?? '발행 실패' })
    }
    setIssuing(false)
  }

  async function doAction(txId: string, action: 'CANCEL' | 'APPROVE' | 'DISPUTE' | 'RESOLVE') {
    setCorrecting(txId)
    await fetch('/api/admin/tc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'correct', txId, newStatus: action, note: correctNote }),
    })
    const p = new URLSearchParams()
    if (txStatus) p.set('status', txStatus)
    const d = await fetch(`/api/admin/tc?${p}`).then(r => r.json())
    setTxList(d.transactions ?? [])
    setCorrecting(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Coins className="h-6 w-6 text-amber-500" />
          TC 관리
        </h1>
        <p className="text-sm text-muted-foreground mt-1">TC 발행 및 거래 수정</p>
      </div>

      <Tabs defaultValue="issue">
        <TabsList>
          <TabsTrigger value="issue">TC 발행</TabsTrigger>
          <TabsTrigger value="correct">거래 수정</TabsTrigger>
        </TabsList>

        {/* ── TC 발행 탭 ── */}
        <TabsContent value="issue" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* 회원 선택 */}
            <Card>
              <CardHeader><CardTitle className="text-base">1. 회원 선택</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="이름 또는 전화번호 검색"
                    value={memberSearch}
                    onChange={e => setMemberSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {filteredMembers.slice(0, 20).map(m => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMember(m)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        selectedMember?.id === m.id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <span className="font-medium">{m.name}</span>
                      <span className="text-xs ml-2 opacity-70">{m.phone}</span>
                      <span className="text-xs ml-2 opacity-70">잔액 {Number(m.tcBalance).toFixed(1)} TC</span>
                    </button>
                  ))}
                </div>
                {selectedMember && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md px-3 py-2 text-sm">
                    선택됨: <strong>{selectedMember.name}</strong> ({selectedMember.dong})
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 발행 정보 */}
            <Card>
              <CardHeader><CardTitle className="text-base">2. 발행 내용</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>발행 유형</Label>
                  <select
                    value={issueForm.txType}
                    onChange={e => setIssueForm(f => ({ ...f, txType: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="FREE_ALLOCATION">무상배분 (취약계층 월 배분)</option>
                    <option value="COMMUNITY_BONUS">공동체 보너스</option>
                    <option value="WAGE_SUPPLEMENT">임금 보전 TC</option>
                    <option value="COMMUNITY_FUND_GIFT">기금 증여</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tcAmount">TC 수량 *</Label>
                  <Input
                    id="tcAmount"
                    type="number"
                    min="0.1"
                    step="0.5"
                    placeholder="예: 10"
                    value={issueForm.tcAmount}
                    onChange={e => setIssueForm(f => ({ ...f, tcAmount: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="duration">연동 시간 (분, 선택)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="0"
                    step="15"
                    placeholder="0"
                    value={issueForm.durationMinutes}
                    onChange={e => setIssueForm(f => ({ ...f, durationMinutes: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="issueNote">사유 *</Label>
                  <textarea
                    id="issueNote"
                    value={issueForm.note}
                    onChange={e => setIssueForm(f => ({ ...f, note: e.target.value }))}
                    rows={2}
                    placeholder="발행 사유를 입력하세요"
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                  />
                </div>

                {issueResult && (
                  <div className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${issueResult.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {issueResult.ok ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    {issueResult.msg}
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={handleIssue}
                  disabled={issuing || !selectedMember || !issueForm.tcAmount || !issueForm.note}
                >
                  {issuing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  TC 발행하기
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── 거래 수정 탭 ── */}
        <TabsContent value="correct" className="space-y-4 mt-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="이름, 메모 검색"
                value={txSearch}
                onChange={e => setTxSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={txStatus}
              onChange={e => setTxStatus(e.target.value)}
              className="h-10 px-3 rounded-md border border-input bg-white text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">전체 상태</option>
              <option value="PENDING">대기</option>
              <option value="APPROVED">승인</option>
              <option value="DISPUTED">분쟁</option>
              <option value="CANCELLED">취소</option>
            </select>
          </div>

          {txLoading ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />불러오는 중…
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTx.length === 0 && (
                <p className="text-center py-10 text-muted-foreground text-sm">거래 내역이 없습니다.</p>
              )}
              {filteredTx.map(tx => (
                <Card key={tx.id} className="overflow-hidden">
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100">
                            {TX_TYPE_LABEL[tx.txType] ?? tx.txType}
                          </span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[tx.status]}`}>
                            {STATUS_LABEL[tx.status]}
                          </span>
                          <span className="text-sm font-bold text-amber-600">
                            {Number(tx.tcAmount).toFixed(2)} TC
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          제공: {tx.provider?.name ?? '–'} → 수신: {tx.receiver?.name ?? '–'}
                        </div>
                        {tx.note && <p className="text-xs text-muted-foreground italic">"{tx.note}"</p>}
                        <p className="text-xs text-muted-foreground">{formatDate(tx.createdAt)}</p>
                      </div>

                      {/* 액션 버튼 */}
                      <div className="flex flex-wrap gap-1.5 shrink-0">
                        {tx.status === 'PENDING' && (
                          <Button size="sm" variant="outline" className="h-7 text-xs text-green-700 border-green-300"
                            onClick={() => doAction(tx.id, 'APPROVE')}
                            disabled={correcting === tx.id}>
                            <CheckCircle className="h-3 w-3 mr-1" />승인
                          </Button>
                        )}
                        {(tx.status === 'PENDING' || tx.status === 'APPROVED') && (
                          <Button size="sm" variant="outline" className="h-7 text-xs text-red-700 border-red-300"
                            onClick={() => doAction(tx.id, 'CANCEL')}
                            disabled={correcting === tx.id}>
                            <XCircle className="h-3 w-3 mr-1" />취소
                          </Button>
                        )}
                        {tx.status === 'APPROVED' && (
                          <Button size="sm" variant="outline" className="h-7 text-xs text-orange-700 border-orange-300"
                            onClick={() => doAction(tx.id, 'DISPUTE')}
                            disabled={correcting === tx.id}>
                            <AlertTriangle className="h-3 w-3 mr-1" />분쟁
                          </Button>
                        )}
                        {tx.status === 'DISPUTED' && (
                          <Button size="sm" variant="outline" className="h-7 text-xs text-blue-700 border-blue-300"
                            onClick={() => doAction(tx.id, 'RESOLVE')}
                            disabled={correcting === tx.id}>
                            <RotateCcw className="h-3 w-3 mr-1" />해결
                          </Button>
                        )}
                        {correcting === tx.id && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
