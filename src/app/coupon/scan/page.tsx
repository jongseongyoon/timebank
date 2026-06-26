'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, ArrowLeft, Gift, Store } from 'lucide-react'
import { Button } from '@/components/ui/button'

type StoreInfo = { id: string; storeName: string; dong: string; category: string }
type Step = 'scan' | 'pay' | 'done'

export default function CouponScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const jsQRRef = useRef<any>(null)
  const scanningRef = useRef(false)

  const [step, setStep] = useState<Step>('scan')
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const [store, setStore] = useState<StoreInfo | null>(null)
  const [balance, setBalance] = useState(0)
  const [amount, setAmount] = useState(0)
  const [item, setItem] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ storeName: string; paidAmount: number; remainingBalance: number } | null>(null)

  const stopStream = useCallback(() => {
    scanningRef.current = false
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  useEffect(() => () => stopStream(), [stopStream])

  async function loadStore(storeId: string) {
    const res = await fetch(`/api/scan/store/${storeId}`)
    const d = await res.json()
    if (!res.ok) { setError(d.error); return }
    if (d.couponBalance <= 0) { setError('사용 가능한 착한쿠폰이 없습니다.'); return }
    setStore(d.store); setBalance(d.couponBalance); setAmount(0); setItem(''); setStep('pay')
  }

  async function loadStoreOwner(memberId: string) {
    const res = await fetch(`/api/scan/user/${memberId}`)
    const d = await res.json()
    if (!res.ok) { setError(d.error); return }
    if (!d.store) { setError('착한가게 QR이 아닙니다. 가게에 비치된 QR을 스캔해 주세요.'); return }
    if (d.myCouponBalance <= 0) { setError('사용 가능한 착한쿠폰이 없습니다.'); return }
    setStore(d.store); setBalance(d.myCouponBalance); setAmount(0); setItem(''); setStep('pay')
  }

  function handleQR(text: string) {
    const s = text.match(/^goodstore:(.+)$/)
    if (s) { loadStore(s[1]); return }
    const m = text.match(/^timepay:member:(.+)$/)
    if (m) { loadStoreOwner(m[1]); return }
    setError('착한가게 QR이 아닙니다. 다시 시도해 주세요.')
  }

  const tick = useCallback(() => {
    const video = videoRef.current, canvas = canvasRef.current, jsQR = jsQRRef.current
    if (!video || !canvas || !jsQR || !scanningRef.current) return
    if (video.readyState >= 2 && video.videoWidth > 0) {
      canvas.width = video.videoWidth; canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (ctx) {
        ctx.drawImage(video, 0, 0)
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })
        if (code?.data) { stopStream(); setScanning(false); handleQR(code.data); return }
      }
    }
    if (scanningRef.current) rafRef.current = requestAnimationFrame(tick)
  }, [stopStream])

  async function startScan() {
    setError('')
    try {
      if (!jsQRRef.current) { const mod = await import('jsqr'); jsQRRef.current = mod.default }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      const video = videoRef.current
      if (video) { video.srcObject = stream; video.setAttribute('playsinline', 'true'); await video.play() }
      scanningRef.current = true
      setScanning(true)
      rafRef.current = requestAnimationFrame(tick)
    } catch (e: any) {
      const name = (e as DOMException)?.name
      setError(name === 'NotAllowedError' ? '카메라 권한이 거부됐습니다. 설정에서 허용해 주세요.' : '카메라를 시작할 수 없습니다.')
    }
  }

  function stopScan() { stopStream(); setScanning(false) }

  function reset() { stopScan(); setStep('scan'); setStore(null); setResult(null); setError(''); setAmount(0); setItem('') }

  async function pay() {
    if (!store || amount <= 0) return
    setLoading(true); setError('')
    const res = await fetch('/api/coupons/pay', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId: store.id, cashAmount: amount, itemDescription: item || undefined }),
    })
    const d = await res.json()
    setLoading(false)
    if (!res.ok) { setError(d.error); return }
    setResult({ storeName: d.storeName, paidAmount: d.paidAmount, remainingBalance: d.remainingBalance })
    setStep('done')
  }

  return (
    <div className="space-y-4">
      <canvas ref={canvasRef} className="hidden" />

      {step === 'scan' && (
        <>
          <h1 className="text-xl font-bold text-center">착한가게 결제</h1>
          <p className="text-sm text-center text-gray-500">가게에 비치된 QR을 스캔하세요</p>
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl py-3 px-4 whitespace-pre-line">{error}</div>}
          <div className="relative bg-black rounded-2xl overflow-hidden" style={{ aspectRatio: '1' }}>
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline autoPlay />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className={`w-52 h-52 border-4 rounded-2xl ${scanning ? 'border-orange-400 animate-pulse' : 'border-white/50'}`} />
            </div>
          </div>
          <Button onClick={scanning ? stopScan : startScan}
            className="w-full h-14 text-lg gap-2 bg-orange-600 hover:bg-orange-700" variant={scanning ? 'outline' : 'default'}>
            <Camera className="h-5 w-5" /> {scanning ? '스캔 중지' : '카메라 시작'}
          </Button>
        </>
      )}

      {step === 'pay' && store && (
        <>
          <button onClick={reset} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
            <ArrowLeft className="h-4 w-4" /> 다시 스캔
          </button>
          <div className="bg-white border rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Store className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-lg font-bold">{store.storeName}</p>
                <p className="text-sm text-gray-500">{store.dong} · {store.category}</p>
              </div>
            </div>
            <div className="bg-orange-50 rounded-xl px-4 py-3 text-center">
              <p className="text-xs text-orange-500 font-medium">내 착한쿠폰 잔액</p>
              <p className="text-2xl font-bold text-orange-700">{balance.toLocaleString('ko-KR')}원</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">결제 금액 (원)</label>
              <input type="number" min={0} max={balance} step={100} value={amount || ''}
                onChange={e => setAmount(Math.min(Number(e.target.value), balance))}
                placeholder="0"
                className="w-full h-14 text-center text-2xl font-bold border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500" />
              <div className="flex gap-2">
                {[5000, 10000, 20000].map(n => (
                  <button key={n} onClick={() => setAmount(Math.min(n, balance))} disabled={n > balance}
                    className="flex-1 px-2 py-1.5 rounded-lg text-sm border border-gray-300 hover:bg-gray-50 disabled:opacity-30">
                    {n / 10000 % 1 === 0 ? `${n / 10000}만` : `${n / 1000}천`}원
                  </button>
                ))}
                <button onClick={() => setAmount(balance)}
                  className="flex-1 px-2 py-1.5 rounded-lg text-sm border border-orange-300 text-orange-700 hover:bg-orange-50">전액</button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">구매 품목 (선택)</label>
              <input value={item} onChange={e => setItem(e.target.value)} placeholder="예: 생필품, 식료품..."
                className="w-full h-10 px-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg py-2 px-3">{error}</p>}
          <Button onClick={pay} disabled={loading || amount <= 0} className="w-full h-14 text-lg gap-2 bg-orange-600 hover:bg-orange-700">
            <Gift className="h-5 w-5" /> {loading ? '결제 중...' : `${amount.toLocaleString('ko-KR')}원 결제하기`}
          </Button>
        </>
      )}

      {step === 'done' && result && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-5xl">✅</div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold">결제 완료!</h2>
            <p className="text-gray-700 font-medium">{result.storeName}</p>
            <p className="text-orange-700 font-bold text-lg">{result.paidAmount.toLocaleString('ko-KR')}원 결제</p>
            <p className="text-sm text-gray-500">남은 쿠폰 잔액 {result.remainingBalance.toLocaleString('ko-KR')}원</p>
          </div>
          <Button onClick={reset} className="w-full h-12 bg-orange-600 hover:bg-orange-700">다시 결제하기</Button>
        </div>
      )}
    </div>
  )
}
