'use client'

import { useEffect, useState } from 'react'
import { Star, X, Heart, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

type UnratedTx = {
  id: string
  counterpartName: string
  isProvider: boolean
  tcAmount: number
  completedAt: string
}

export function RatingModal({ memberId }: { memberId: string }) {
  const [pending, setPending] = useState<UnratedTx | null>(null)
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [review, setReview] = useState('')

  // 건강 위기 별점 (제공자가 수혜자 건강 상태 기록)
  const [healthRating, setHealthRating] = useState(0)
  const [healthHover, setHealthHover] = useState(0)
  const [healthSituation, setHealthSituation] = useState('')
  const [healthAction, setHealthAction] = useState('')

  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const needsHealthDetail = healthRating >= 3

  useEffect(() => {
    if (!memberId) return
    fetch('/api/transactions?page=1&limit=10')
      .then(r => r.json())
      .then(d => {
        const txs = d.transactions ?? []
        const unrated = txs.find((tx: any) => {
          if (tx.status !== 'APPROVED') return false
          const isProvider = tx.providerId === memberId
          const isReceiver = tx.receiverId === memberId
          if (!isProvider && !isReceiver) return false
          if (isProvider && tx.providerRating) return false
          if (isReceiver && tx.receiverRating) return false
          const hours = (Date.now() - new Date(tx.completedAt || tx.createdAt).getTime()) / 3600000
          return hours < 24
        })
        if (unrated) {
          const isProvider = unrated.providerId === memberId
          setPending({
            id: unrated.id,
            counterpartName: isProvider
              ? (unrated.receiver?.name ?? '상대방')
              : (unrated.provider?.name ?? '상대방'),
            isProvider,
            tcAmount: Number(unrated.tcAmount),
            completedAt: unrated.completedAt ?? unrated.createdAt,
          })
        }
      })
  }, [memberId])

  async function handleSubmit() {
    if (!rating || !pending) return
    // 건강 별점 3점 이상이면 상황+대책 필수
    if (pending.isProvider && needsHealthDetail && (!healthSituation.trim() || !healthAction.trim())) {
      return
    }
    setLoading(true)
    await fetch(`/api/transactions/${pending.id}/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rating,
        review,
        ...(pending.isProvider && healthRating > 0 ? {
          healthRating,
          healthSituation: healthSituation.trim() || undefined,
          healthAction: healthAction.trim() || undefined,
        } : {}),
      }),
    })
    setLoading(false)
    setSubmitted(true)
    setTimeout(() => setPending(null), 1500)
  }

  if (!pending) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h3 className="font-bold text-lg">거래 후기를 남겨주세요</h3>
            <p className="text-sm text-gray-500">{pending.counterpartName}님과의 거래</p>
          </div>
          <button onClick={() => setPending(null)} className="p-1 text-gray-400 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!submitted ? (
          <div className="p-5 space-y-5">
            {/* TP 정보 */}
            <div className="bg-blue-50 rounded-xl py-3 text-center">
              <p className="text-sm text-blue-600 font-medium">
                {pending.isProvider ? '제공한' : '받은'} TP: {pending.tcAmount.toFixed(2)} TP
              </p>
            </div>

            {/* 서비스 만족도 별점 */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-center">서비스 만족도를 선택해주세요</p>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHover(star)}
                    onMouseLeave={() => setHover(0)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-9 w-9 transition-colors ${
                        star <= (hover || rating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <p className="text-center text-sm text-gray-500">
                  {['', '별로였어요', '아쉬웠어요', '보통이에요', '좋았어요', '최고였어요'][rating]}
                </p>
              )}
            </div>

            {/* 후기 */}
            <div className="space-y-1">
              <label className="text-sm font-medium">한 줄 후기 (선택)</label>
              <textarea
                value={review}
                onChange={e => setReview(e.target.value)}
                maxLength={200}
                rows={2}
                placeholder="거래 경험을 짧게 남겨주세요"
                className="w-full border rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* ── 건강 위기 별점 (제공자만 표시) ── */}
            {pending.isProvider && (
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-red-500" />
                  <p className="text-sm font-semibold text-gray-800">이용자 건강 상태 기록</p>
                </div>
                <p className="text-xs text-gray-500">
                  서비스를 제공하면서 이용자의 건강 상태를 5점 기준으로 평가해주세요.
                  <br />3점 이상이면 상황과 대책을 추가 기록해 주세요.
                </p>

                {/* 건강 별점 */}
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => setHealthRating(star)}
                      onMouseEnter={() => setHealthHover(star)}
                      onMouseLeave={() => setHealthHover(0)}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Heart
                        className={`h-8 w-8 transition-colors ${
                          star <= (healthHover || healthRating)
                            ? 'fill-red-400 text-red-400'
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                {healthRating > 0 && (
                  <p className="text-center text-xs text-gray-500">
                    {['', '매우 양호', '양호', '주의 필요 ⚠️', '위험 🚨', '응급 🆘'][healthRating]}
                  </p>
                )}

                {/* 3점 이상: 상황 + 대책 입력 */}
                {needsHealthDetail && (
                  <div className="space-y-3 bg-red-50 rounded-xl p-4 border border-red-200">
                    <div className="flex items-center gap-1.5 text-red-700">
                      <AlertTriangle className="h-4 w-4" />
                      <p className="text-sm font-semibold">건강 이상 — 상세 기록 필요</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-700">현재 상황 *</label>
                      <textarea
                        value={healthSituation}
                        onChange={e => setHealthSituation(e.target.value)}
                        maxLength={300}
                        rows={2}
                        required
                        placeholder="이용자의 현재 건강 상황을 기록해주세요 (증상, 불편사항 등)"
                        className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-700">필요 대책 *</label>
                      <textarea
                        value={healthAction}
                        onChange={e => setHealthAction(e.target.value)}
                        maxLength={300}
                        rows={2}
                        required
                        placeholder="필요한 조치나 대책을 기록해주세요 (병원 방문 권유, 가족 연락 등)"
                        className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 제출 불가 안내 */}
            {pending.isProvider && needsHealthDetail && (!healthSituation.trim() || !healthAction.trim()) && (
              <p className="text-xs text-center text-red-500">
                건강 이상 기록 시 현재 상황과 필요 대책을 모두 입력해주세요
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => setPending(null)}>나중에</Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  !rating || loading ||
                  (pending.isProvider && needsHealthDetail && (!healthSituation.trim() || !healthAction.trim()))
                }
              >
                {loading ? '제출 중...' : '후기 제출'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-8 flex flex-col items-center gap-3">
            <div className="text-4xl">⭐</div>
            <p className="font-bold text-lg">후기가 등록됐습니다!</p>
            <p className="text-sm text-gray-500">감사합니다</p>
          </div>
        )}
      </div>
    </div>
  )
}
