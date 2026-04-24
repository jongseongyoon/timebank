'use client'

import { useEffect, useRef, useState } from 'react'
import { Star, Send, Play, ArrowLeft } from 'lucide-react'
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
  const [step, setStep] = useState<Step>('scan')
  const [error, setError] = useState('')
  const [scanning, setScanning] = useState(false)
  const [scannedMember, setScannedMember] = useState<ScannedMember | null>(null)
  const [transferAmount, setTransferAmount] = useState(1)
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0])
  const [activeTransaction, setActiveTransaction] = useState<any>(null)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [loading, setLoading] = useState(false)
  const readerRef = useRef<any>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // QR 스캔 시작
  async function startScan() {
    setError('')
    setScanning(true)
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/library')
      const reader = new BrowserMultiFormatReader()
      readerRef.current = reader

      await reader.decodeFromVideoDevice(
        null,
        videoRef.current!,
        async (result, err) => {
          if (result) {
            const text = result.getText()
            // timepay:member:{id} 형식 파싱
            const match = text.match(/^timepay:member:(.+)$/)
            if (!match) { setError('TimePay QR 코드가 아닙니다'); return }
            const memberId = match[1]
            reader.reset()
            setScanning(false)
            await fetchMember(memberId)
          }
        }
      )
    } catch {
      setError('카메라 접근 권한이 필요합니다')
      setScanning(false)
    }
  }

  function stopScan() {
    readerRef.current?.reset()
    setScanning(false)
  }

  async function fetchMember(id: string) {
    const res = await fetch(`/api/scan/user/${id}`)
    const data = await res.json()
    if (!res.ok) { setError(data.error); return }
    setScannedMember(data.member)
    setStep('confirm')
  }

  // TC 직접 송금
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

  // 서비스 시작
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

  // 서비스 종료
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

  useEffect(() => () => {
    readerRef.current?.reset()
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

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
      {step === 'scan' && (
        <>
          <h1 className="text-2xl font-bold text-center">QR 스캔</h1>
          {error && <p className="text-sm text-red-500 text-center bg-red-50 rounded-lg py-2 px-3">{error}</p>}
          <div className="relative bg-black rounded-2xl overflow-hidden aspect-square">
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            {!scanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/60">
                <div className="w-48 h-48 border-4 border-white/60 rounded-2xl" />
                <p className="text-white text-sm">상대방 QR 코드를 사각형에 맞춰주세요</p>
              </div>
            )}
            {scanning && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 border-4 border-blue-400 rounded-2xl animate-pulse" />
              </div>
            )}
          </div>
          <Button
            onClick={scanning ? stopScan : startScan}
            className="w-full h-14 text-lg"
            variant={scanning ? 'outline' : 'default'}
          >
            {scanning ? '스캔 중지' : '📷 카메라 시작'}
          </Button>
        </>
      )}

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
                <div className="flex items-center gap-1">
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
          {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg py-2 px-3">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => setStep('service_start')} className="h-14 flex-col gap-0.5">
              <Play className="h-5 w-5" />
              <span className="text-xs">서비스 시작</span>
            </Button>
            <Button onClick={() => setStep('transfer')} className="h-14 flex-col gap-0.5">
              <Send className="h-5 w-5" />
              <span className="text-xs">TC 직접 송금</span>
            </Button>
          </div>
        </>
      )}

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
                className="w-full h-12 text-center text-2xl font-bold border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg py-2 px-3">{error}</p>}
          <Button onClick={handleTransfer} disabled={loading} className="w-full h-12">
            {loading ? '처리 중...' : `${transferAmount} TC 송금하기`}
          </Button>
        </>
      )}

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
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      selectedCategory === cat
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-600 border-gray-300'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg py-2 px-3">{error}</p>}
          <Button onClick={handleServiceStart} disabled={loading} className="w-full h-14 text-lg gap-2">
            <Play className="h-5 w-5" />
            {loading ? '시작 중...' : '서비스 시작'}
          </Button>
        </>
      )}

      {step === 'service_running' && (
        <>
          <h2 className="text-xl font-bold text-center">서비스 진행 중</h2>
          <div className="bg-blue-600 rounded-2xl p-8 flex flex-col items-center gap-4 text-white">
            <p className="text-sm opacity-80">{selectedCategory}</p>
            <p className="text-6xl font-bold font-mono">{fmtTime(elapsedSec)}</p>
            <p className="text-sm opacity-80">예상 TC: {(elapsedSec / 3600).toFixed(2)} TC</p>
          </div>
          {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg py-2 px-3">{error}</p>}
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

      {step === 'done' && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-4xl">
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
          <Button onClick={reset} className="w-full h-12">새로운 거래 시작</Button>
        </div>
      )}
    </div>
  )
}
