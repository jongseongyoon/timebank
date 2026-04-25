'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, Lock, CheckCircle } from 'lucide-react'

export default function SetupPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'open' | 'done'>('loading')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ name: string; phone: string } | null>(null)

  useEffect(() => {
    fetch('/api/setup')
      .then(r => r.json())
      .then(d => setStatus(d.done ? 'done' : 'open'))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone.trim() }),
    })
    const d = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(d.error)
      return
    }

    setResult(d)
    setStatus('done')
  }

  // 로딩 중
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // 이미 완료됨
  if (status === 'done' && !result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white border rounded-2xl shadow-sm p-10 max-w-sm w-full text-center space-y-4">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
            <Lock className="h-8 w-8 text-gray-400" />
          </div>
          <h1 className="text-xl font-bold text-gray-700">접근 불가</h1>
          <p className="text-sm text-gray-500">
            관리자 설정이 이미 완료됐습니다.<br />
            이 페이지는 최초 1회만 사용 가능합니다.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="mt-2 w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
          >
            로그인하러 가기
          </button>
        </div>
      </div>
    )
  }

  // 완료 직후
  if (result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white border rounded-2xl shadow-sm p-10 max-w-sm w-full text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-xl font-bold">관리자 설정 완료!</h1>
          <div className="bg-green-50 rounded-xl px-4 py-3 text-sm text-green-800">
            <p className="font-bold">{result.name}</p>
            <p>{result.phone}</p>
            <p className="mt-1 text-xs">ADMIN + COORDINATOR 권한 부여됨</p>
          </div>
          <p className="text-xs text-gray-400">
            이 페이지는 이제 영구적으로 비활성화됩니다
          </p>
          <button
            onClick={() => router.push('/login')}
            className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700"
          >
            로그인하러 가기
          </button>
        </div>
      </div>
    )
  }

  // 설정 폼
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white border rounded-2xl shadow-sm p-8 max-w-sm w-full space-y-6">
        {/* 헤더 */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
            <ShieldCheck className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold">관리자 초기 설정</h1>
          <p className="text-sm text-gray-500">
            최초 1회만 사용 가능한 페이지입니다.<br />
            관리자로 지정할 회원의 전화번호를 입력하세요.
          </p>
        </div>

        {/* 경고 배너 */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
          ⚠️ 이 페이지는 설정 완료 후 영구적으로 잠깁니다.<br />
          가입된 회원의 전화번호만 입력 가능합니다.
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">관리자 전화번호</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="010-0000-0000"
              required
              className="w-full h-12 px-4 border rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !phone}
            className="w-full h-12 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '처리 중...' : '관리자 권한 부여'}
          </button>
        </form>
      </div>
    </div>
  )
}
