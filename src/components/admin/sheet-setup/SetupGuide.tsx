import { useState } from 'react'
import { Info, ChevronDown, ChevronUp, Check, Copy } from 'lucide-react'

export function SetupGuide() {
  const [open,   setOpen]   = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => { setCopied(key); setTimeout(() => setCopied(null), 2000) })
  }

  const steps = [
    { no: 1, title: 'Google Cloud Console 접속',
      desc: <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">https://console.cloud.google.com</a> },
    { no: 2, title: '새 프로젝트 생성',
      desc: <span>프로젝트명: <code className="bg-gray-100 px-1 rounded">timepay-gwangju</code></span> },
    { no: 3, title: 'Google Sheets API 활성화',
      desc: <span>API 및 서비스 → 라이브러리 → Google Sheets API → <strong>사용</strong></span> },
    { no: 4, title: '서비스 계정 생성',
      desc: <span>API 및 서비스 → 사용자 인증 정보 → 사용자 인증 정보 만들기 → 서비스 계정<br />
        계정명: <code className="bg-gray-100 px-1 rounded">timepay-sheet-manager</code></span> },
    { no: 5, title: 'JSON 키 다운로드',
      desc: <span>생성된 서비스 계정 클릭 → 키 → 키 추가 → JSON → 다운로드</span> },
    { no: 6, title: '마스터 스프레드시트 준비',
      desc: (
        <div className="space-y-1 text-sm text-gray-600">
          <p>① 개인 구글 계정으로 구글 시트 파일을 하나 생성</p>
          <p>② 시트 우측 상단 [공유] → 서비스 계정 이메일 입력 → <strong>편집자</strong> 권한 부여</p>
          <p>③ URL에서 시트 ID 복사: <code className="bg-gray-100 px-1 rounded">https://docs.google.com/spreadsheets/d/<strong>여기가ID</strong>/edit</code></p>
          <div className="bg-amber-50 border border-amber-200 rounded p-2 mt-1 text-amber-800 text-xs">
            서비스 계정(로봇)은 구글 정책상 저장 용량 0바이트로 직접 파일 생성이 불가합니다.
            반드시 개인 계정이 마스터 시트를 만들고 서비스 계정을 편집자로 초대해야 합니다.
          </div>
        </div>
      ) },
    { no: 7, title: 'Vercel 환경변수 추가',
      desc: (
        <div className="space-y-2 mt-1">
          {[
            { key: 'GOOGLE_SERVICE_ACCOUNT_EMAIL', val: 'JSON의 client_email 값' },
            { key: 'GOOGLE_PRIVATE_KEY',            val: 'JSON의 private_key 값 (\\n 포함)' },
            { key: 'GOOGLE_MASTER_SHEET_ID',        val: '마스터 스프레드시트 ID (URL 중간 값)' },
          ].map(({ key, val }) => (
            <div key={key} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
              <code className="text-xs text-indigo-700 flex-1">{key}</code>
              <span className="text-xs text-gray-500">{val}</span>
              <button onClick={() => copy(key, key)} className="p-1 hover:bg-gray-200 rounded transition-colors">
                {copied === key ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3 text-gray-400" />}
              </button>
            </div>
          ))}
          <p className="text-xs text-gray-500 mt-1">환경변수 추가 후 Vercel → Settings → <strong>Redeploy</strong> 클릭</p>
        </div>
      ) },
  ]

  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 text-sm font-medium transition-colors">
        <span className="flex items-center gap-2"><Info className="h-4 w-4 text-blue-500" />구글 API 1회 설정 안내</span>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>
      {open && (
        <div className="border-t p-5 space-y-4">
          {steps.map(s => (
            <div key={s.no} className="flex gap-4">
              <div className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{s.no}</div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">{s.title}</p>
                <div className="text-sm text-gray-600 mt-0.5">{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
