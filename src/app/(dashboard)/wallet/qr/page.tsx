'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, Share2, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function MyQrPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [member, setMember] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/members/me').then(r => r.json()).then(d => {
      setMember(d.member)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!member?.qrCode || !canvasRef.current) return
    // 동적 import로 qrcode 번들 분리
    import('qrcode').then(QRCode => {
      QRCode.toCanvas(canvasRef.current!, member.qrCode, {
        width: 240,
        margin: 2,
        color: { dark: '#1e3a8a', light: '#ffffff' },
      })
    })
  }, [member])

  async function handleDownload() {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `timepay-qr-${member?.name}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  async function handleShare() {
    const canvas = canvasRef.current
    if (!canvas || !navigator.share) return
    canvas.toBlob(async (blob) => {
      if (!blob) return
      const file = new File([blob], 'timepay-qr.png', { type: 'image/png' })
      try {
        await navigator.share({ title: 'TimePay QR 코드', files: [file] })
      } catch {
        // 공유 취소
      }
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-sm mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-center">내 QR 코드</h1>

      {/* QR 카드 */}
      <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center gap-4 border">
        {/* 이름 + 별점 */}
        <div className="text-center">
          <p className="text-xl font-bold">{member?.name}</p>
          <p className="text-sm text-gray-500">{member?.dong}</p>
          <div className="flex items-center justify-center gap-1 mt-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-medium">
              {Number(member?.avgRating).toFixed(1)}
            </span>
            <span className="text-xs text-gray-400">({member?.ratingCount}건)</span>
          </div>
        </div>

        {/* QR 코드 */}
        <div className="p-3 bg-white border-2 border-blue-100 rounded-xl">
          {member?.qrCode ? (
            <canvas ref={canvasRef} />
          ) : (
            <div className="w-[240px] h-[240px] flex items-center justify-center bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-400 text-center px-4">
                QR 코드가 없습니다.<br />로그아웃 후 재가입 필요
              </p>
            </div>
          )}
        </div>

        {/* TC 잔액 */}
        <div className="bg-blue-50 rounded-xl px-6 py-3 w-full text-center">
          <p className="text-xs text-blue-500 font-medium">현재 TC 잔액</p>
          <p className="text-2xl font-bold text-blue-700">
            {Number(member?.tcBalance).toFixed(2)} TC
          </p>
        </div>
      </div>

      {/* 버튼 */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" onClick={handleDownload} className="h-12 gap-2">
          <Download className="h-4 w-4" />
          QR 저장하기
        </Button>
        <Button onClick={handleShare} className="h-12 gap-2" disabled={!navigator?.share}>
          <Share2 className="h-4 w-4" />
          QR 공유하기
        </Button>
      </div>

      <p className="text-xs text-center text-gray-400">
        이 QR을 상대방에게 보여주면 거래를 시작할 수 있습니다
      </p>
    </div>
  )
}
