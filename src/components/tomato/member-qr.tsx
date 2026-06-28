'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Printer, Copy, Check } from 'lucide-react'

// 회원 QR + 개인 링크. QR/링크는 회원 본인 조회 페이지(/tm/<token>)로 연결되며 직원 스캔도 동일 인식.
export function MemberQr({
  qrDataUrl,
  name,
  memberNo,
  memberUrl,
}: {
  qrDataUrl: string
  name: string
  memberNo: string | null
  memberUrl: string
}) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard?.writeText(memberUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

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
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt={`${name} QR`} className="w-32 h-32 border rounded-md" />
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground mb-2">
            회원에게 이 QR(또는 아래 링크)을 전달하면, 회원이 휴대폰으로 본인 포인트·관리기한을 보고
            매장에서 그대로 스캔용으로 쓸 수 있습니다.
          </p>
          <Button variant="outline" size="sm" onClick={print}>
            <Printer className="h-4 w-4" /> QR 출력
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-md border bg-gray-50 px-3 py-2">
        <span className="text-xs text-muted-foreground truncate flex-1" title={memberUrl}>{memberUrl}</span>
        <Button variant="ghost" size="sm" onClick={copy}>
          {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
          {copied ? '복사됨' : '링크 복사'}
        </Button>
      </div>
    </div>
  )
}
