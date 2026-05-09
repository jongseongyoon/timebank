'use client'

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mb-6">
        <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M6.343 6.343a9 9 0 000 11.314M9.172 9.172a5 5 0 000 5.656M12 12h.01" />
        </svg>
      </div>
      <h1 className="text-xl font-bold text-gray-900 mb-2">오프라인 상태입니다</h1>
      <p className="text-sm text-gray-500 mb-6">
        인터넷 연결을 확인하고 다시 시도해주세요.<br />
        일부 기능은 오프라인에서도 이용 가능합니다.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 active:scale-95 transition-all"
      >
        다시 시도
      </button>
      <p className="mt-8 text-xs text-gray-400">TimePay - 광주서구 타임뱅크</p>
    </div>
  )
}
