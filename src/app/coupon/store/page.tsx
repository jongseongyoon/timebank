'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, Store } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function CouponStoreQrPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [store, setStore] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/store/me')
      .then(r => r.json())
      .then(d => { setStore(d.store); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!store?.qrValue || !canvasRef.current) return
    import('qrcode').then(QRCode => {
      QRCode.toCanvas(canvasRef.current!, store.qrValue, { width: 260, margin: 2, color: { dark: '#9a3412', light: '#ffffff' } })
    })
  }, [store])

  function download() {
    const canvas = canvasRef.current
    if (!canvas) return
    const a = document.createElement('a')
    a.download = `goodstore-qr-${store?.storeName ?? 'qr'}.png`
    a.href = canvas.toDataURL('image/png')
    a.click()
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" /></div>

  if (!store) return (
    <div className="py-12 text-center space-y-3">
      <Store className="h-12 w-12 text-gray-300 mx-auto" />
      <p className="text-gray-600">연결된 착한가게가 없습니다.</p>
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="bg-white border border-orange-200 rounded-2xl px-4 py-3 text-sm text-orange-800">
        <p className="font-semibold mb-0.5">🏪 우리 가게 결제 QR</p>
        <p className="text-xs text-orange-600">손님이 착한쿠폰으로 결제할 때 이 QR을 보여주세요.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col items-center gap-4 border">
        <div className="text-center">
          <p className="text-xl font-bold">{store.storeName}</p>
          <p className="text-sm text-gray-500">{store.dong} · {store.category}</p>
        </div>
        <div className="p-3 bg-white border-2 border-orange-100 rounded-xl">
          <canvas ref={canvasRef} className="mx-auto" />
        </div>
        <div className="grid grid-cols-2 gap-3 w-full">
          <div className="bg-orange-50 rounded-xl px-3 py-3 text-center">
            <p className="text-xs text-orange-500 font-medium">정산 대기</p>
            <p className="text-lg font-bold text-orange-700">{store.cashBalance.toLocaleString('ko-KR')}원</p>
          </div>
          <div className="bg-gray-50 rounded-xl px-3 py-3 text-center">
            <p className="text-xs text-gray-500 font-medium">누적 결제</p>
            <p className="text-lg font-bold text-gray-700">{store.totalReceived.toLocaleString('ko-KR')}원</p>
          </div>
        </div>
      </div>

      <Button variant="outline" onClick={download} className="w-full h-12 gap-2">
        <Download className="h-4 w-4" /> QR 저장 (인쇄용)
      </Button>
    </div>
  )
}
