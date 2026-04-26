'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, Share2, Star, RefreshCw, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function MyQrPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [member, setMember] = useState<any>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [canShare, setCanShare] = useState(false)

  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && !!navigator.share)
  }, [])

  useEffect(() => {
    fetch('/api/members/me')
      .then(r => r.json())
      .then(d => {
        setMember(d.member)
        if (d.member?.qrCode) setQrCode(d.member.qrCode)
        setLoading(false)
      })
  }, [])

  // qrCode가 생기면 캔버스에 렌더링
  useEffect(() => {
    if (!qrCode || !canvasRef.current) return
    import('qrcode').then(QRCode => {
      QRCode.toCanvas(canvasRef.current!, qrCode, {
        width: 240,
        margin: 2,
        color: { dark: '#1e3a8a', light: '#ffffff' },
      })
    })
  }, [qrCode])

  // QR 생성
  async function handleGenerate() {
    setGenerating(true)
    const res = await fetch('/api/members/me/qr', { method: 'POST' })
    const d = await res.json()
    setGenerating(false)
    if (res.ok) setQrCode(d.qrCode)
  }

  async function handleDownload() {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `timepay-qr-${member?.name ?? 'qr'}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  async function handleShare() {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.toBlob(async (blob) => {
      if (!blob) return
      const file = new File([blob], 'timepay-qr.png', { type: 'image/png' })
      try {
        await navigator.share({ title: 'TimePay QR 코드', files: [file] })
      } catch { /* 취소 또는 미지원 */ }
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
      {/* 안내 배너 */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 text-sm text-blue-800">
        <p className="font-semibold mb-0.5">📱 내 QR 코드 = 나를 증명하는 수단</p>
        <p className="text-xs text-blue-600 leading-relaxed">
          서비스를 <strong>받을 때</strong> 이 화면을 상대방에게 보여주세요.<br />
          상대방이 QR을 스캔하여 거래를 시작합니다.
        </p>
      </div>

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
              {Number(member?.avgRating ?? 0).toFixed(1)}
            </span>
            <span className="text-xs text-gray-400">({member?.ratingCount ?? 0}건)</span>
          </div>
        </div>

        {/* QR 코드 영역 */}
        <div className="p-3 bg-white border-2 border-blue-100 rounded-xl min-h-[248px] flex items-center justify-center w-full">
          {qrCode ? (
            <canvas ref={canvasRef} className="mx-auto" />
          ) : (
            <div className="w-full flex flex-col items-center gap-5 py-6 px-4">
              {/* 크고 명확한 QR 없음 안내 */}
              <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center">
                <QrCode className="h-10 w-10 text-gray-400" />
              </div>
              <div className="text-center space-y-1">
                <p className="font-semibold text-gray-700">아직 QR 코드가 없습니다</p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  아래 버튼을 눌러 나만의 QR 코드를<br />지금 바로 발급받으세요
                </p>
              </div>
              {/* 생성 버튼 — 크게, 눈에 띄게 */}
              <Button
                onClick={handleGenerate}
                disabled={generating}
                size="lg"
                className="w-full h-14 text-base gap-2"
              >
                <RefreshCw className={`h-5 w-5 ${generating ? 'animate-spin' : ''}`} />
                {generating ? 'QR 코드 생성 중...' : '✨ QR 코드 발급받기'}
              </Button>
            </div>
          )}
        </div>

        {/* TC 잔액 */}
        <div className="bg-blue-50 rounded-xl px-6 py-3 w-full text-center">
          <p className="text-xs text-blue-500 font-medium">현재 TC 잔액</p>
          <p className="text-2xl font-bold text-blue-700">
            {Number(member?.tcBalance ?? 0).toFixed(2)} TC
          </p>
        </div>
      </div>

      {/* 저장·공유 버튼 — QR 있을 때만 */}
      {qrCode && (
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={handleDownload}
            className="h-12 gap-2"
          >
            <Download className="h-4 w-4" />
            QR 저장하기
          </Button>
          {canShare ? (
            <Button onClick={handleShare} className="h-12 gap-2">
              <Share2 className="h-4 w-4" />
              QR 공유하기
            </Button>
          ) : (
            <Button onClick={handleDownload} className="h-12 gap-2">
              <Download className="h-4 w-4" />
              이미지 저장
            </Button>
          )}
        </div>
      )}

      <p className="text-xs text-center text-gray-400">
        이 QR을 상대방에게 보여주면 거래를 시작할 수 있습니다
      </p>
    </div>
  )
}
