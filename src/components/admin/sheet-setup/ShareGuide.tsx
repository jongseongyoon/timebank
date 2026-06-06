import { useState } from 'react'
import { ShieldAlert, XCircle, ChevronDown, ChevronUp } from 'lucide-react'

export function ShareGuide() {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 text-sm font-medium transition-colors">
        <span className="flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-amber-500" />코디네이터 공유 방법</span>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>
      {open && (
        <div className="border-t p-5">
          <ol className="space-y-2 text-sm text-gray-700 list-decimal list-inside">
            <li>아래 테이블에서 해당 동의 <strong>[열기]</strong> 버튼 클릭</li>
            <li>구글 시트 우측 상단 <strong>[공유]</strong> 버튼 클릭</li>
            <li>코디네이터의 구글 계정 이메일 입력</li>
            <li>권한: <strong>"편집자"</strong> 선택</li>
            <li><strong>[보내기]</strong> 클릭</li>
          </ol>
          <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-start gap-2">
            <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span><strong>"링크 있는 누구나"</strong> 공유 설정 절대 금지 — 개인정보 유출 위험</span>
          </div>
        </div>
      )}
    </div>
  )
}
