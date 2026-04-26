'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Star, Send, Play, ArrowLeft, Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ScannedMember = {
  id: string
  name: string
  dong: string
  tcBalance: string
  avgRating: string
  ratingCount: number
  roles: string[]
}

type Step = 'scan' | 'confirm' | 'transfer' | 'service_start' | 'service_running' | 'done'

const CATEGORIES = [
  '이동지원', '장보기', '말벗', '식사지원', '가사지원',
  '의료동행', '교육', '디지털지원', '수리', '아이돌봄', '기타',
]

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const jsQRRef = useRef<any>(null)
  const isScanningRef = useRef(false)

  const [step, setStep] = useState<Step>('scan')
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const [scannedMember, setScannedMember] = useState<ScannedMember | null>(null)
  const [transferAmount, setTransferAmount] = useState(1)
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0])
  const [activeTransaction, setActiveTransaction] = useState<any>(null)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // 스트림 정리
  const stopStream = useCallback(() => {
    isScanningRef.current = false
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  // QR 감지 루프 (requestAnimationFrame)
  const tick = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    const jsQR = jsQRRef.current
    if (!video || !canvas || !jsQR || !isScanningRef.current) return

    if (video.readyState >= 2 && video.videoWidth > 0) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (ctx) {
        ctx.drawImage(video, 0, 0)
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(imgData.data, imgData.width, imgData.height, {
          inversionAttempts: 'dontInvert',
        })
        if (code?.data) {
          stopStream()
          setScanning(false)
          handleQRResult(code.data)
          return
        }
      }
    }

    if (isScanningRef.current) {
      rafRef.current = requestAnimationFrame(tick)
    }
  }, [stopStream])

  // QR 결과 처리
  function handleQRResult(text: string) {
    const match = text.match(/^timepay:member:(.+)$/)
    if (!match) {
      setError('TimePay QR 코드가 아닙니다. 다시 시도해 주세요.')
      return
    }
    fetchMember(match[1])
  }

  // 카메라 시작
  async function startScan() {
    setError('')
    try {
      // jsQR 동적 로드 (최초 1회)
      if (!jsQRRef.current) {
        const mod = await import('jsqr')
        jsQRRef.current = mod.default
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }, // 후면 카메라 우선
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })

      streamRef.current = stream
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        video.setAttribute('playsinline', 'true') // iOS 필수
        await video.play()
      }

      isScanningRef.current = true
      setScanning(true)
      rafRef.current = requestAnimationFrame(tick)
    } catch (e: any) {
      const name = (e as DOMException)?.name
      setError(
        name === 'NotAllowedError'
          ? '카메라 권한이 거부됐습니다.\n브라우저 설정 → 카메라 → 허용으로 바꾼 후 다시 시도하세요.'
          : name === 'NotFoundError'
          ? '카메라를 찾을 수 없습니다.'
          : '카메라를 시작할 수 없습니다. 잠시 후 다시 시도해 주세요.'
      )
    }
  }

  function stopScan() {
    stopStream()
    setScanning(false)
  }

  async function fetchMember(id: string) {
    const res = await fetch(`/api/scan/user/${id}`)
    const data = await res.json()
    if (!res.ok) { setError(data.error); return }
    setScannedMember(data.member)
    setStep('confirm')
  }

  async function handleTransfer() {
    setLoading(true)
    const res = await fetch('/api/scan/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiverId: scannedMember!.id, tcAmount: transferAmount }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error); return }
    setStep('done')
  }

  async function handleServiceStart() {
    setLoading(true)
    const res = await fetch('/api/scan/service/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiverId: scannedMember!.id, category: selectedCategory }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error); return }
    setActiveTransaction(data.transaction)
    setElapsedSec(0)
    setStep('service_running')
    timerRef.current = setInterval(() => setElapsedSec(s => s + 1), 1000)
  }

  async function handleServiceEnd() {
    if (timerRef.current) clearInterval(timerRef.current)
    setLoading(true)
    const res = await fetch('/api/scan/service/end', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId: activeTransaction.id }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error); return }
    setActiveTransaction(data)
    setStep('done')
  }

  useEffect(() => {
    return () => {
      stopStream()
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [stopStream])

  function reset() {
    stopScan()
    setStep('scan')
    setScannedMember(null)
    setError('')
    setActiveTransaction(null)
  }

  function fmtTime(sec: number) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0')
    const s = (sec % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  return (
    <div className="max-w-sm mx-auto space-y-4">
      {/* hidden canvas — QR 분석용 */}
      <canvas ref={canvasRef} className="hidden" />

      {/* ── 스캔 화면 ── */}
      {step === 'scan' && (
        <>
          <h1 className="text-2xl font-bold text-center">QR 스캔</h1>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl py-3 px-4 whitespace-pre-line">
              {error}
            </div>
          )}

          {/* 카메라 뷰파인더 */}
          <div className="relative bg-black rounded-2xl overflow-hidden" style={{ aspectRatio: '1' }}>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              muted
              playsInline
              autoPlay
            />
            {/* 가이드 사각형 */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className={`w-52 h-52 border-4 rounded-2xl ${scanning ? 'border-blue-400 animate-pulse' : 'border-white/50'}`} />
              {!scanning && (
                <p className="text-white text-sm mt-4 bg-black/40 px-3 py-1 rounded-full">
                  상대방 QR 코드를 사각형에 맞춰주세요
                </p>
              )}
              {scanning && (
                <p className="text-blue-300 text-sm mt-4 bg-black/40 px-3 py-1 rounded-full animate-pulse">
                  QR 코드를 찾는 중…
                </p>
              )}
            </div>
          </div>

          <Button
            onClick={scanning ? stopScan : startScan}
            className="w-full h-14 text-lg gap-2"
            variant={scanning ? 'outline' : 'default'}
          >
            <Camera className="h-5 w-5" />
            {scanning ? '스캔 중지' : '카메라 시작'}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            카메라 권한을 허용해야 QR 스캔이 가능합니다
          </p>
        </>
      )}

      {/* ── 상대방 확인 ── */}
      {step === 'confirm' && scannedMember && (
        <>
          <button onClick={reset} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
            <ArrowLeft className="h-4 w-4" /> 다시 스캔
          </button>
          <h2 className="text-xl font-bold">상대방 확인</h2>
          <div className="bg-white border rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-2xl font-bold text-blue-700">
                {scannedMember.name[0]}
              </div>
              <div>
                <p className="text-lg font-bold">{scannedMember.name}</p>
                <p className="text-sm text-gray-500">{scannedMember.dong}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm">{Number(scannedMember.avgRating).toFixed(1)}</span>
                  <span className="text-xs text-gray-400">({scannedMember.ratingCount}건)</span>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl px-4 py-2 text-sm text-center">
              TC 잔액: <span className="font-bold text-blue-700">{Number(scannedMember.tcBalance).toFixed(2)} TC</span>
            </div>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg py-2 px-3">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => setStep('service_start')} className="h-16 flex-col gap-1">
              <Play className="h-5 w-5" />
              <span className="text-xs">서비스 시작</span>
            </Button>
            <Button onClick={() => setStep('transfer')} className="h-16 flex-col gap-1">
              <Send className="h-5 w-5" />
              <span className="text-xs">TC 직접 송금</span>
            </Button>
          </div>
        </>
      )}

      {/* ── TC 송금 ── */}
      {step === 'transfer' && scannedMember && (
        <>
          <button onClick={() => setStep('confirm')} className="flex items-center gap-1 text-sm text-gray-500">
            <ArrowLeft className="h-4 w-4" /> 뒤로
          </button>
          <h2 className="text-xl font-bold">TC 송금</h2>
          <div className="bg-white border rounded-2xl p-5 space-y-4">
            <p className="text-center text-gray-600">
              <span className="font-bold text-blue-700">{scannedMember.name}</span>님께 송금
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">TC 수량</label>
              <input
                type="number"
                min={0.5} max={100} step={0.5}
                value={transferAmount}
                onChange={e => setTransferAmount(Number(e.target.value))}
                className="w-full h-14 text-center text-3xl font-bold border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg py-2 px-3">{error}</p>}
          <Button onClick={handleTransfer} disabled={loading} className="w-full h-12">
            {loading ? '처리 중...' : `${transferAmount} TC 송금하기`}
          </Button>
        </>
      )}

      {/* ── 서비스 시작 ── */}
      {step === 'service_start' && scannedMember && (
        <>
          <button onClick={() => setStep('confirm')} className="flex items-center gap-1 text-sm text-gray-500">
            <ArrowLeft className="h-4 w-4" /> 뒤로
          </button>
          <h2 className="text-xl font-bold">서비스 시작</h2>
          <div className="bg-white border rounded-2xl p-5 space-y-4">
            <p className="text-center text-gray-600">
              <span className="font-bold">{scannedMember.name}</span>님을 위한 서비스
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">서비스 종류</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-2 rounded-full text-sm border transition-colors ${
                      selectedCategory === cat
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg py-2 px-3">{error}</p>}
          <Button onClick={handleServiceStart} disabled={loading} className="w-full h-14 text-lg gap-2">
            <Play className="h-5 w-5" />
            {loading ? '시작 중...' : '서비스 시작'}
          </Button>
        </>
      )}

      {/* ── 서비스 진행 중 ── */}
      {step === 'service_running' && (
        <>
          <h2 className="text-xl font-bold text-center">서비스 진행 중</h2>
          <div className="bg-blue-600 rounded-2xl p-8 flex flex-col items-center gap-3 text-white">
            <p className="text-sm opacity-80">{selectedCategory}</p>
            <p className="text-6xl font-bold font-mono tracking-wider">{fmtTime(elapsedSec)}</p>
            <p className="text-sm opacity-80">예상 TC: {(elapsedSec / 3600).toFixed(2)} TC</p>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg py-2 px-3">{error}</p>}
          <Button
            onClick={handleServiceEnd}
            disabled={loading}
            variant="destructive"
            className="w-full h-14 text-lg"
          >
            {loading ? '처리 중...' : '서비스 종료 및 TC 정산'}
          </Button>
        </>
      )}

      {/* ── 완료 ── */}
      {step === 'done' && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-5xl">
            ✅
          </div>
          <div>
            <h2 className="text-2xl font-bold">완료!</h2>
            {activeTransaction?.tcAmount !== undefined && (
              <p className="text-gray-500 mt-2">
                {activeTransaction.durationMinutes}분 · {Number(activeTransaction.tcAmount).toFixed(2)} TC 정산
              </p>
            )}
          </div>
          <Button onClick={reset} className="w-full h-12 text-base">새로운 거래 시작</Button>
        </div>
      )}
    </div>
  )
}
