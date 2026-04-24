'use client'

import { useEffect } from 'react'

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white rounded-xl shadow-sm border p-8 text-center space-y-4 max-w-sm w-full">
        <h2 className="text-xl font-semibold">오류가 발생했습니다</h2>
        <p className="text-sm text-gray-500">
          {error.message || '잠시 후 다시 시도해 주세요.'}
        </p>
        <button
          onClick={reset}
          className="w-full h-10 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
        >
          다시 시도
        </button>
      </div>
    </div>
  )
}
