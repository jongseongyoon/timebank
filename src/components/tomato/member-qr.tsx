'use client'

import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'

// 회원 QR 카드(출력용). qrDataUrl은 서버에서 qrcode로 생성한 data URL.
export function MemberQr({
  qrDataUrl,
  name,
  memberNo,
}: {
  qrDataUrl: string
  name: string
  memberNo: string | null
}) {
  function print() {
    const w = window.open('', '_blank', 'width=420,height=560')
    if (!w) return
    w.document.write(`
      <html><head><title>${name} QR</title>
      <style>
        body{font-family:sans-serif;text-align:center;padding:32px;margin:0}
        h2{margin:0 0 4px}
        p{color:#666;margin:0 0 16px;font-size:14px}
        img{width:240px;height:240px}
        .brand{color:#dc2626;font-weight:700;margin-top:12px}
      </style></head>
      <body>
        <h2>${name}</h2>
        <p>${memberNo ?? ''}</p>
        <img src="${qrDataUrl}" alt="QR" />
        <div class="brand">토마토의료기</div>
        <script>window.onload=function(){window.print()}</script>
      </body></html>`)
    w.document.close()
  }

  return (
    <div className="flex items-center gap-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qrDataUrl} alt={`${name} QR`} className="w-32 h-32 border rounded-md" />
      <div>
        <p className="text-sm text-muted-foreground mb-2">
          매장에서 이 QR을 스캔하면 회원이 인식됩니다. 카드·화면용으로 출력하세요.
        </p>
        <Button variant="outline" size="sm" onClick={print}>
          <Printer className="h-4 w-4" /> QR 출력
        </Button>
      </div>
    </div>
  )
}
