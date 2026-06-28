'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Camera, ArrowLeft, MinusCircle, ShoppingCart, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { lookupByToken, scanRedeem, type ScannedMember } from '@/app/tomato/scan/actions'

const REDEEM_REASONS = ['AS비용', '물품구입']

export default function TomatoScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const jsQRRef = useRef<any>(null)
  const scanningRef = useRef(false)

  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const [member, setMember] = useState<ScannedMember | null>(null)
  const [busy, setBusy] = useState(false)
  const [redeemAmt, setRedeemAmt] = useState('')
  const [redeemReason, setRedeemReason] = useState(REDEEM_REASONS[0])
  const [doneMsg, setDoneMsg] = useState('')

  const stopStream = useCallback(() => {
    scanningRef.current = false
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  useEffect(() => () => stopStream(), [stopStream])

  async function handleResult(text: string) {
    // 지원: tomato:member:<토큰> / .../tm/<토큰> URL / 순수 토큰
    const prefix = text.match(/^tomato:member:(.+)$/)
    const url = text.match(/\/tm\/([A-Za-z0-9]+)/)
    const token = prefix ? prefix[1] : url ? url[1] : text.trim()
    const res = await lookupByToken(token)
    if ('error' in res) {
      setError(res.error)
      return
    }
    setError('')
    setDoneMsg('')
    setMember(res.member)
  }

  const tick = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    const jsQR = jsQRRef.current
    if (!video || !canvas || !jsQR || !scanningRef.current) return
    if (video.readyState >= 2 && video.videoWidth > 0) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (ctx) {
        ctx.drawImage(video, 0, 0)
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })
        if (code?.data) {
          stopStream()
          setScanning(false)
          handleResult(code.data)
          return
        }
      }
    }
    if (scanningRef.current) rafRef.current = requestAnimationFrame(tick)
  }, [stopStream])

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
      scanningRef.current = true
      setScanning(true)
      rafRef.current = requestAnimationFrame(tick)
    } catch (e: any) {
      const name = (e as DOMException)?.name
      setError(
        name === 'NotAllowedError'
          ? '카메라 권한이 거부됐습니다. 브라우저 설정에서 카메라를 허용하세요.'
          : name === 'NotFoundError'
            ? '카메라를 찾을 수 없습니다.'
            : '카메라를 시작할 수 없습니다.'
      )
    }
  }

  function reset() {
    stopStream()
    setScanning(false)
    setMember(null)
    setError('')
    setRedeemAmt('')
    setDoneMsg('')
  }

  function doRedeem() {
    if (!member) return
    setBusy(true)
    setError('')
    scanRedeem({ memberId: member.id, amount: redeemAmt, reason: redeemReason }).then((res) => {
      setBusy(false)
      if ('error' in res) setError(res.error)
      else {
        setMember({ ...member, pointsBalance: res.balance })
        setRedeemAmt('')
        setDoneMsg(`사용 완료 — 현재 잔액 ${res.balance.toLocaleString()}P`)
      }
    })
  }

  return (
    <div className="max-w-sm mx-auto space-y-4">
      <canvas ref={canvasRef} className="hidden" />
      <h1 className="text-2xl font-bold text-center">QR 스캔</h1>

      {error && (
        <p role="alert" className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2 whitespace-pre-line">
          {error}
        </p>
      )}

      {!member ? (
        <>
          <div className="relative bg-black rounded-2xl overflow-hidden" style={{ aspectRatio: '1' }}>
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline autoPlay />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className={'w-52 h-52 border-4 rounded-2xl ' + (scanning ? 'border-red-400 animate-pulse' : 'border-white/50')} />
              {!scanning && <p className="text-white text-sm mt-4 bg-black/40 px-3 py-1 rounded-full">회원 QR을 사각형에 맞춰주세요</p>}
            </div>
          </div>
          <Button onClick={scanning ? reset : startScan} className="w-full h-14 text-lg gap-2" variant={scanning ? 'outline' : 'default'}>
            <Camera className="h-5 w-5" /> {scanning ? '스캔 중지' : '카메라 시작'}
          </Button>
          <p className="text-xs text-center text-muted-foreground">매장 PC·태블릿 카메라 권한이 필요합니다(HTTPS).</p>
        </>
      ) : (
        <>
          <button onClick={reset} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> 다시 스캔
          </button>

          {/* 회원 카드 */}
          <div className="bg-white border rounded-2xl p-5 space-y-3">
            <div>
              <p className="text-lg font-bold">{member.name}</p>
              <p className="text-sm text-muted-foreground">{member.memberNo || '번호없음'} · {member.phone || '-'}</p>
            </div>
            <div className="rounded-xl bg-red-50 px-4 py-3 text-center">
              <p className="text-xs text-muted-foreground">보유 포인트</p>
              <p className="text-2xl font-bold text-red-700">{member.pointsBalance.toLocaleString()}P</p>
            </div>
            {doneMsg && (
              <p className="text-sm text-green-800 bg-green-50 rounded-md px-3 py-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> {doneMsg}
              </p>
            )}
          </div>

          {/* 적립(구매) */}
          <Link href={`/tomato/purchases/new?memberId=${member.id}`}>
            <Button variant="outline" className="w-full h-12 gap-2">
              <ShoppingCart className="h-4 w-4" /> 구매 적립하기 (구매 등록)
            </Button>
          </Link>

          {/* 사용 */}
          <div className="rounded-md border p-3 space-y-2">
            <p className="text-sm font-semibold flex items-center gap-2">
              <MinusCircle className="h-4 w-4 text-red-600" /> 포인트 사용
            </p>
            <div className="flex items-end gap-2">
              <div className="space-y-1 flex-1">
                <label className="text-xs text-muted-foreground">사용 포인트</label>
                <Input type="number" inputMode="numeric" value={redeemAmt} onChange={(e) => setRedeemAmt(e.target.value)} placeholder="0" />
              </div>
              <select value={redeemReason} onChange={(e) => setRedeemReason(e.target.value)} className="h-9 rounded-md border px-2 text-sm bg-white">
                {REDEEM_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <Button onClick={doRedeem} disabled={busy || !redeemAmt} className="w-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MinusCircle className="h-4 w-4" />} 사용
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
