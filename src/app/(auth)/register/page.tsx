'use client'

import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import Link from 'next/link'
import { Coins } from 'lucide-react'
import { registerAction, type RegisterState } from './actions'

const DONGS = [
  '양동', '양3동', '농성1동', '농성2동', '광천동', '유덕동',
  '치평동', '상무1동', '상무2동', '화정1동', '화정2동',
  '화정3동', '화정4동', '서창동', '금호1동', '금호2동',
  '풍암동', '동천동',
]

/* ── 제출 버튼 (useFormStatus는 반드시 별도 컴포넌트) ── */
function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full h-11 rounded-md bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
    >
      {pending ? '가입 중…' : '가입하기'}
    </button>
  )
}

/* ── 선택 토글 칩 (useState + inline style로 Tailwind JIT 문제 회피) ── */
function ToggleChip({
  name,
  value,
  children,
  color = 'blue',
}: {
  name: string
  value?: string
  children: React.ReactNode
  color?: 'blue' | 'amber'
}) {
  const [checked, setChecked] = useState(false)

  const activeStyle: React.CSSProperties = checked
    ? color === 'blue'
      ? { backgroundColor: '#2563eb', color: '#ffffff', borderColor: '#2563eb' }
      : { backgroundColor: '#fef3c7', color: '#92400e', borderColor: '#fbbf24' }
    : {}

  return (
    <label className="cursor-pointer select-none">
      <input
        type="checkbox"
        name={name}
        value={value}
        checked={checked}
        onChange={(e) => setChecked(e.target.checked)}
        className="sr-only"
      />
      <span
        style={activeStyle}
        className="inline-block px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 text-sm font-medium transition-colors"
      >
        {children}
      </span>
    </label>
  )
}

/* ── 메인 페이지 ── */
export default function RegisterPage() {
  const initial: RegisterState = { error: '' }
  const [state, action] = useFormState(registerAction, initial)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-sm border p-8 space-y-6">

        {/* 헤더 */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="bg-blue-600 rounded-full p-3">
              <Coins className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">회원가입</h1>
          <p className="text-sm text-gray-500">타임뱅크에 참여하세요</p>
        </div>

        {/* 폼 */}
        <form action={action} className="space-y-5">

          {/* 이름 / 출생연도 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-sm font-medium">이름 *</label>
              <input
                id="name" name="name" required placeholder="홍길동"
                className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="birthYear" className="text-sm font-medium">출생연도 *</label>
              <input
                id="birthYear" name="birthYear" type="number" required
                min={1920} max={2010} placeholder="1970"
                className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 전화번호 */}
          <div className="space-y-1.5">
            <label htmlFor="phone" className="text-sm font-medium">전화번호 * (로그인 ID)</label>
            <input
              id="phone" name="phone" type="tel" required placeholder="010-0000-0000"
              className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 이메일 */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium">이메일 (선택)</label>
            <input
              id="email" name="email" type="email" placeholder="example@email.com"
              className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 비밀번호 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium">비밀번호 *</label>
              <input
                id="password" name="password" type="password" required placeholder="8자 이상"
                className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="passwordConfirm" className="text-sm font-medium">비밀번호 확인 *</label>
              <input
                id="passwordConfirm" name="passwordConfirm" type="password" required placeholder="비밀번호 재입력"
                className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 관할 동 */}
          <div className="space-y-1.5">
            <label htmlFor="dong" className="text-sm font-medium">관할 동 *</label>
            <select
              id="dong" name="dong" required
              className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">동을 선택하세요</option>
              {DONGS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* 참여 유형 */}
          <div className="space-y-2">
            <p className="text-sm font-medium">참여 유형 * (중복 선택 가능)</p>
            <div className="flex gap-3">
              <ToggleChip name="roles" value="RECEIVER" color="blue">
                수요자 (서비스 받기)
              </ToggleChip>
              <ToggleChip name="roles" value="PROVIDER" color="blue">
                제공자 (서비스 제공)
              </ToggleChip>
            </div>
          </div>

          {/* 해당 사항 */}
          <div className="space-y-2">
            <p className="text-sm font-medium">해당 사항 선택</p>
            <div className="flex gap-3 flex-wrap">
              <ToggleChip name="isSenior" color="amber">어르신</ToggleChip>
              <ToggleChip name="isVulnerable" color="amber">취약계층</ToggleChip>
              <ToggleChip name="isDisabled" color="amber">장애인</ToggleChip>
            </div>
          </div>

          {/* 오류 메시지 */}
          {state.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-4 py-3">
              {state.error}
            </div>
          )}

          <SubmitButton />
        </form>

        <p className="text-center text-sm text-gray-500">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="text-blue-600 hover:underline font-medium">
            로그인
          </Link>
        </p>
      </div>
    </div>
  )
}
