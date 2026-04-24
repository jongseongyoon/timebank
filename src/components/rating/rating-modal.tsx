'use client'

import { useEffect, useState } from 'react'
import { Star, X } from 'lucide-react'
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
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!memberId) return
    // 평가 안 된 완료 거래 조회
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
          // 완료 후 24시간 이내
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
    setLoading(true)
    await fetch(`/api/transactions/${pending.id}/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating, review }),
    })
    setLoading(false)
    setSubmitted(true)
    setTimeout(() => setPending(null), 1500)
  }

  if (!pending) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
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
            {/* TC 정보 */}
            <div className="bg-blue-50 rounded-xl py-3 text-center">
              <p className="text-sm text-blue-600 font-medium">
                {pending.isProvider ? '제공한' : '받은'} TC: {pending.tcAmount.toFixed(2)} TC
              </p>
            </div>

            {/* 별점 */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-center">만족도를 선택해주세요</p>
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

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => setPending(null)}>나중에</Button>
              <Button onClick={handleSubmit} disabled={!rating || loading}>
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
