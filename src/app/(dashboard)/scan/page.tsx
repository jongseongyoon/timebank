'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Star, Send, Play, ArrowLeft, Camera, AlertTriangle, Phone, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ScannedMember = {
  id: string
  name: string
  phone: string
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

const MIN_BALANCE = -3.0

// localStorage 키: 앱이 백그라운드로 가도 진행 중 거래 유지
const TX_KEY = 'timepay_active_tx'

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

  const [maxPayable, setMaxPayable] = useState<number>(0)
  const [maxMinutes, setMaxMinutes] = useState<number>(0)
  const maxPayableRef = useRef<number>(0)
  const elapsedSecRef = useRef<number>(0)

  // 화면 잠금 — 서비스 진행 중 탭 전환 감지
  const [bgWarning, setBgWarning] = useState(false)

  // ── 스트림 정리
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

  // ── 앱 시작 시 진행 중 거래 복원 (localStorage)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(TX_KEY)
      if (saved) {
        const { tx, member, category, startedAt, maxPayable: mp, maxMinutes: mm } = JSON.parse(saved)
        const elapsed = Math.floor((Date.now() - startedAt) / 1000)
        setActiveTransaction(tx)
        setScannedMember(member)
        setSelectedCategory(category)
        setElapsedSec(elapsed)
        elapsedSecRef.current = elapsed
        setMaxPayable(mp)
        setMaxMinutes(mm)
        maxPayableRef.current = mp
        setStep('service_running')
        startTimer()
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 서비스 진행 중: 화면 전환 방지
  useEffect(() => {
    if (step !== 'service_running') return

    // 브라우저 닫기/새로고침 경고
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = '서비스가 진행 중입니다! 종료 버튼을 먼저 누른 후 나가주세요.'
      return e.returnValue
    }

    // 백그라운드 전환 감지 (다른 앱으로 이동 등)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // 진행 상태를 localStorage에 저장해 복원 가능하게 함
        try {
          const saved = localStorage.getItem(TX_KEY)
          if (saved) {
            const parsed = JSON.parse(saved)
            // 이미 저장된 상태 유지 (startedAt 기준으로 elapsed 재계산)
          }
        } catch {}
      } else if (document.visibilityState === 'visible') {
        // 포그라운드로 돌아왔을 때 경고 표시
        setBgWarning(true)
        setTimeout(() => setBgWarning(false), 4000)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [step])

  // ── QR 감지 루프
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
        const code = jsQRRef.current(imgData.data, imgData.width, imgData.height, {
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
    if (isScanningRef.current) rafRef.current = requestAnimationFrame(tick)
  }, [stopStream])

  function handleQRResult(text: string) {
    const match = text.match(/^timepay:member:(.+)$/)
    if (!match) { setError('TimePay QR 코드가 아닙니다. 다시 시도해 주세요.'); return }
    fetchMember(match[1])
  }

  async function startScan() {
    setError('')
    try {
      if (!jsQRRef.current) {
        const mod = await import('jsqr')
        jsQRRef.current = mod.default
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        video.setAttribute('playsinline', 'true')
        await video.play()
      }
      isScanningRef.current = true
      setScanning(true)
      rafRef.current = requestAnimationFrame(tick)
    } catch (e: any) {
      const name = (e as DOMException)?.name
      setError(
        name === 'NotAllowedError' ? '카메라 권한이 거부됐습니다.\n브라우저 설정 → 카메라 → 허용으로 바꾼 후 다시 시도하세요.'
        : name === 'NotFoundError' ? '카메라를 찾을 수 없습니다.'
        : '카메라를 시작할 수 없습니다. 잠시 후 다시 시도해 주세요.'
      )
    }
  }

  function stopScan() { stopStream(); setScanning(false) }

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

  function startTimer() {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setElapsedSec(s => {
        const next = s + 1
        elapsedSecRef.current = next
        const maxSec = maxPayableRef.current * 3600
        if (maxSec > 0 && next >= maxSec) {
          clearInterval(timerRef.current!)
          timerRef.current = null
          autoServiceEnd()
        }
        return next
      })
    }, 1000)
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

    const tx = data.transaction
    const mp = data.maxPayable ?? 0
    const mm = data.maxMinutes ?? 0
    setActiveTransaction(tx)
    setElapsedSec(0)
    elapsedSecRef.current = 0
    setMaxPayable(mp)
    setMaxMinutes(mm)
    maxPayableRef.current = mp

    // localStorage에 진행 상태 저장 (화면 전환 복원용)
    try {
      localStorage.setItem(TX_KEY, JSON.stringify({
        tx, member: scannedMember, category: selectedCategory,
        startedAt: Date.now(), maxPayable: mp, maxMinutes: mm,
      }))
    } catch {}

    setStep('service_running')
    startTimer()
  }

  async function autoServiceEnd() {
    setError('최대 획득 TP에 도달하여 자동 종료됩니다...')
    await doServiceEnd()
  }

  async function handleServiceEnd() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    await doServiceEnd()
  }

  async function doServiceEnd() {
    setLoading(true)
    const res = await fetch('/api/scan/service/end', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId: activeTransaction.id }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error || '서비스 종료 실패'); return }

    // 완료 후 localStorage 정리
    try { localStorage.removeItem(TX_KEY) } catch {}
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
    setMaxPayable(0)
    setMaxMinutes(0)
    setBgWarning(false)
    try { localStorage.removeItem(TX_KEY) } catch {}
  }

  function fmtTime(sec: number) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0')
    const s = (sec % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const estimatedTP = Math.min(elapsedSec / 3600, maxPayable > 0 ? maxPayable : Infinity)
  const remainingSec = maxMinutes * 60 - elapsedSec
  const isNearLimit = maxMinutes > 0 && remainingSec <= 300 && remainingSec > 0
  const receiverBalance = scannedMember ? Number(scannedMember.tcBalance) : 0
  const isBalanceLow = receiverBalance <= MIN_BALANCE + 0.5

  return (
    <div className="max-w-sm mx-auto space-y-4">
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
          <div className="relative bg-black rounded-2xl overflow-hidden" style={{ aspectRatio: '1' }}>
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline autoPlay />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className={`w-52 h-52 border-4 rounded-2xl ${scanning ? 'border-blue-400 animate-pulse' : 'border-white/50'}`} />
              {!scanning && <p className="text-white text-sm mt-4 bg-black/40 px-3 py-1 rounded-full">상대방 QR 코드를 사각형에 맞춰주세요</p>}
              {scanning && <p className="text-blue-300 text-sm mt-4 bg-black/40 px-3 py-1 rounded-full animate-pulse">QR 코드를 찾는 중…</p>}
            </div>
          </div>
          <Button onClick={scanning ? stopScan : startScan} className="w-full h-14 text-lg gap-2" variant={scanning ? 'outline' : 'default'}>
            <Camera className="h-5 w-5" />
            {scanning ? '스캔 중지' : '카메라 시작'}
          </Button>
          <p className="text-xs text-center text-muted-foreground">카메라 권한을 허용해야 QR 스캔이 가능합니다</p>
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
            <div className="flex items-center justify-between">
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
              {/* ── 전화하기 버튼 ── */}
              {scannedMember.phone && (
                <a
                  href={`tel:${scannedMember.phone}`}
                  className="flex flex-col items-center gap-1 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-700 hover:bg-green-100 transition-colors"
                >
                  <Phone className="h-6 w-6" />
                  <span className="text-xs font-medium">전화하기</span>
                </a>
              )}
            </div>

            {/* 전화번호 표시 */}
            {scannedMember.phone && (
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span>{scannedMember.phone}</span>
                <span className="text-xs text-gray-400 ml-auto">시간·장소 등 사전 소통</span>
              </div>
            )}

            <div className={`rounded-xl px-4 py-3 text-center ${isBalanceLow ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
              <p className="text-xs text-gray-500 font-medium mb-0.5">상대방 TP 잔액</p>
              <p className={`text-xl font-bold ${isBalanceLow ? 'text-red-600' : 'text-blue-700'}`}>
                {Number(scannedMember.tcBalance).toFixed(2)} TP
              </p>
              <p className="text-xs text-gray-400 mt-0.5">최대 {Math.max(0, receiverBalance - MIN_BALANCE).toFixed(2)} TP 거래 가능</p>
              {isBalanceLow && (
                <div className="flex items-center justify-center gap-1 mt-1 text-xs text-red-600">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>잔액이 부족합니다 (한도: -3.0 TP)</span>
                </div>
              )}
            </div>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg py-2 px-3">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => setStep('service_start')} disabled={receiverBalance - MIN_BALANCE <= 0} className="h-16 flex-col gap-1">
              <Play className="h-5 w-5" />
              <span className="text-xs">서비스 시작</span>
            </Button>
            <Button onClick={() => setStep('transfer')} className="h-16 flex-col gap-1">
              <Send className="h-5 w-5" />
              <span className="text-xs">TP 직접 송금</span>
            </Button>
          </div>
        </>
      )}

      {/* ── TP 송금 ── */}
      {step === 'transfer' && scannedMember && (
        <>
          <button onClick={() => setStep('confirm')} className="flex items-center gap-1 text-sm text-gray-500"><ArrowLeft className="h-4 w-4" /> 뒤로</button>
          <h2 className="text-xl font-bold">TP 송금</h2>
          <div className="bg-white border rounded-2xl p-5 space-y-4">
            <p className="text-center text-gray-600">
              <span className="font-bold text-blue-700">{scannedMember.name}</span>님께 송금
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">TP 수량</label>
              <input type="number" min={0.5} max={100} step={0.5} value={transferAmount}
                onChange={e => setTransferAmount(Number(e.target.value))}
                className="w-full h-14 text-center text-3xl font-bold border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg py-2 px-3">{error}</p>}
          <Button onClick={handleTransfer} disabled={loading} className="w-full h-12">
            {loading ? '처리 중...' : `${transferAmount} TP 송금하기`}
          </Button>
        </>
      )}

      {/* ── 서비스 시작 ── */}
      {step === 'service_start' && scannedMember && (
        <>
          <button onClick={() => setStep('confirm')} className="flex items-center gap-1 text-sm text-gray-500"><ArrowLeft className="h-4 w-4" /> 뒤로</button>
          <h2 className="text-xl font-bold">서비스 시작</h2>
          <div className="bg-white border rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-gray-600"><span className="font-bold">{scannedMember.name}</span>님을 위한 서비스</p>
              {/* 시작 전에도 전화 가능 */}
              {scannedMember.phone && (
                <a href={`tel:${scannedMember.phone}`} className="flex items-center gap-1.5 text-green-700 text-sm bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <Phone className="h-4 w-4" />
                  <span>전화하기</span>
                </a>
              )}
            </div>
            <div className="bg-blue-50 rounded-xl px-4 py-3 text-center">
              <p className="text-xs text-blue-600 font-medium">최대 획득 가능 TP</p>
              <p className="text-2xl font-bold text-blue-700">{Math.max(0, receiverBalance - MIN_BALANCE).toFixed(2)} TP</p>
              <p className="text-xs text-gray-500 mt-0.5">약 {Math.round(Math.max(0, receiverBalance - MIN_BALANCE) * 60)}분 서비스 가능</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">서비스 종류</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-2 rounded-full text-sm border transition-colors ${selectedCategory === cat ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}>
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
          <h2 className="text-xl font-bold text-center flex items-center justify-center gap-2">
            <Lock className="h-5 w-5 text-blue-600" />
            서비스 진행 중
          </h2>

          {/* 백그라운드 복귀 경고 */}
          {bgWarning && (
            <div className="bg-yellow-50 border border-yellow-400 rounded-xl px-4 py-3 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-yellow-800">화면에서 잠시 벗어났습니다</p>
                <p className="text-xs text-yellow-700">타이머는 계속 진행 중입니다. 서비스 완료 후 종료 버튼을 눌러주세요.</p>
              </div>
            </div>
          )}

          {/* 자동종료 임박 경고 */}
          {isNearLimit && (
            <div className="bg-orange-50 border border-orange-300 rounded-xl px-4 py-3 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-orange-800">곧 자동 종료됩니다</p>
                <p className="text-xs text-orange-600">{Math.floor(remainingSec / 60)}분 {remainingSec % 60}초 후 최대 TP 도달로 자동 종료</p>
              </div>
            </div>
          )}

          {/* 타이머 카드 */}
          <div className="bg-blue-600 rounded-2xl p-8 flex flex-col items-center gap-3 text-white">
            <p className="text-sm opacity-80">{selectedCategory}</p>
            <p className="text-6xl font-bold font-mono tracking-wider">{fmtTime(elapsedSec)}</p>
            <p className="text-base font-semibold">예상 TP: {estimatedTP.toFixed(2)} TP</p>
            {maxPayable > 0 && (
              <p className="text-xs opacity-70">
                최대 {maxPayable.toFixed(2)} TP ({maxMinutes}분) / 잔여 {Math.max(0, maxMinutes * 60 - elapsedSec) > 0 ? fmtTime(Math.max(0, maxMinutes * 60 - elapsedSec)) : '자동종료'}
              </p>
            )}
          </div>

          {maxMinutes > 0 && (
            <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
              <div className={`h-full rounded-full transition-all ${isNearLimit ? 'bg-orange-500' : 'bg-blue-500'}`}
                style={{ width: `${Math.min(100, (elapsedSec / (maxMinutes * 60)) * 100)}%` }} />
            </div>
          )}

          {/* 진행 중 수혜자 전화 */}
          {scannedMember?.phone && (
            <a href={`tel:${scannedMember.phone}`}
              className="flex items-center justify-center gap-2 w-full h-11 rounded-xl border border-green-300 bg-green-50 text-green-700 text-sm font-medium">
              <Phone className="h-4 w-4" />
              {scannedMember.name}님에게 전화하기 · {scannedMember.phone}
            </a>
          )}

          {/* 화면 잠금 안내 */}
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
            <Lock className="h-3.5 w-3.5 shrink-0" />
            <span>서비스 중에는 이 화면을 유지해 주세요. 다른 앱으로 이동하면 타이머가 계속 진행됩니다.</span>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg py-2 px-3">{error}</p>}
          <Button onClick={handleServiceEnd} disabled={loading} variant="destructive" className="w-full h-14 text-lg">
            {loading ? '처리 중...' : '서비스 종료 및 TP 정산'}
          </Button>
        </>
      )}

      {/* ── 완료 ── */}
      {step === 'done' && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-5xl">✅</div>
          <div>
            <h2 className="text-2xl font-bold">완료!</h2>
            {activeTransaction?.tcAmount !== undefined && (
              <p className="text-gray-500 mt-2">{activeTransaction.durationMinutes}분 · {Number(activeTransaction.tcAmount).toFixed(2)} TP 정산</p>
            )}
          </div>
          <Button onClick={reset} className="w-full h-12 text-base">새로운 거래 시작</Button>
        </div>
      )}
    </div>
  )
}
