'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Phone, Download, QrCode, CheckCircle2, Loader2,
} from 'lucide-react'

const STEPS = [
  { n: 1, text: '손님이 QR코드를 보여드립니다' },
  { n: 2, text: '카메라로 QR을 찍습니다' },
  { n: 3, text: '사용 금액을 입력합니다' },
  { n: 4, text: '[승인] 버튼을 누릅니다' },
  { n: 5, text: '끝입니다! 한 달에 한 번 입금됩니다' },
]

const HELP_TYPES = [
  { value: 'VIDEO_UNCLEAR',  label: '영상을 봐도 잘 모르겠어요' },
  { value: 'CANNOT_SCAN',   label: 'QR 스캔이 안 돼요' },
  { value: 'PAYMENT_ISSUE', label: '결제할 때 오류가 나요' },
  { value: 'OTHER',         label: '기타 문의' },
]

export default function StoreWelcomePage() {
  const [sending, setSending] = useState(false)
  const [sent, setSent]       = useState(false)

  async function requestHelp(requestType: string) {
    setSending(true)
    try {
      await fetch('/api/store/help-request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestType }),
      })
      setSent(true)
    } finally { setSending(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white px-4 py-8 max-w-lg mx-auto space-y-6">
      {/* 헤더 */}
      <div className="text-center">
        <div className="text-5xl mb-3">🎉</div>
        <h1 className="text-2xl font-bold text-teal-800">타임페이에 오신 것을 환영합니다!</h1>
        <p className="text-gray-500 mt-2">3분이면 충분합니다. 아래 영상을 봐주세요.</p>
      </div>

      {/* 사용법 안내 */}
      <Card>
        <CardContent className="pt-5 space-y-4">
          <div className="bg-gray-100 rounded-xl h-48 flex items-center justify-center text-gray-400 text-sm">
            {/* 실제 운영 시 영상 URL로 교체 */}
            <div className="text-center">
              <div className="text-4xl mb-2">▶️</div>
              <p>사용법 영상 (3분)</p>
              <p className="text-xs mt-1">영상 URL 등록 후 활성화됩니다</p>
            </div>
          </div>
          <ol className="space-y-2">
            {STEPS.map(s => (
              <li key={s.n} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs flex items-center justify-center shrink-0 mt-0.5">
                  {s.n}
                </span>
                <span className="text-sm text-gray-700">{s.text}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* 리플릿 다운로드 */}
      <Card>
        <CardContent className="pt-5">
          <p className="text-sm font-semibold mb-2">📄 리플릿 다운로드</p>
          <p className="text-xs text-gray-500 mb-3">인쇄해서 계산대 옆에 붙여두세요</p>
          <Button variant="outline" className="w-full gap-2" asChild>
            {/* 실제 PDF URL로 교체 */}
            <a href="/files/goodstore-guide.pdf" download>
              <Download className="h-4 w-4" /> 리플릿 다운로드하기
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* 연습하기 */}
      <Card className="border-teal-200 bg-teal-50">
        <CardContent className="pt-5">
          <p className="text-sm font-semibold text-teal-800 mb-1">지금 바로 해보기</p>
          <p className="text-xs text-teal-600 mb-3">실제 거래 없이 화면만 체험해볼 수 있습니다</p>
          <Button className="w-full gap-2 bg-teal-600 hover:bg-teal-700 text-white" asChild>
            <a href="/scan">
              <QrCode className="h-4 w-4" /> 테스트 QR로 연습하기
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* 도움 요청 */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center gap-2 mb-3">
            <Phone className="h-4 w-4 text-gray-500" />
            <p className="text-sm font-semibold">도움이 필요하신가요?</p>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            ☎ 전화 문의: <strong>062-000-0000</strong> (평일 9~18시)
          </p>

          {sent ? (
            <div className="flex items-center gap-2 text-green-700 text-sm py-2">
              <CheckCircle2 className="h-4 w-4" />
              도움 요청이 접수됐습니다. 코디네이터가 연락드립니다.
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-gray-400">어려운 점을 선택하면 코디네이터에게 알림이 전송됩니다</p>
              {HELP_TYPES.map(h => (
                <Button
                  key={h.value}
                  variant="outline"
                  className="w-full justify-start text-sm"
                  disabled={sending}
                  onClick={() => requestHelp(h.value)}>
                  {sending ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
                  {h.label}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
