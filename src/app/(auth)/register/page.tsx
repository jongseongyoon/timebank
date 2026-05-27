'use client'

import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import Link from 'next/link'
import { Coins } from 'lucide-react'
import { registerAction, type RegisterState } from './actions'
import { DONGS } from '@/lib/constants'

/* ── 제출 버튼 (useFormStatus는 반드시 별도 컴포넌트) ── */
function SubmitButton({ disabled: extraDisabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus()
  const isDisabled  = pending || extraDisabled
  return (
    <button
      type="submit"
      disabled={isDisabled}
      className="w-full h-11 rounded-md bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
    >
      {pending ? '가입 중…' : '가입하기'}
    </button>
  )
}

/* ── 선택 토글 칩 ── */
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

/* ── 전화번호 자동 하이픈 ── */
function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`
}

/* ── 메인 페이지 ── */
export default function RegisterPage() {
  const initial: RegisterState = { error: '' }
  const [state, action] = useFormState(registerAction, initial)
  const [phone, setPhone] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [agreeHealth,  setAgreeHealth]  = useState(false)

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatPhone(e.target.value)
    setPhone(formatted)
  }

  function handleBirthDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    // 숫자만 추출, 최대 8자리
    const digits = e.target.value.replace(/\D/g, '').slice(0, 8)
    setBirthDate(digits)
  }

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
          <p className="text-sm text-gray-500">TimePay에 참여하세요</p>
        </div>

        {/* 폼 */}
        <form action={action} className="space-y-5">

          {/* 이름 / 생년월일 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-sm font-medium">이름 *</label>
              <input
                id="name" name="name" required placeholder="홍길동"
                lang="ko" inputMode="text"
                className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="birthDate" className="text-sm font-medium">
                생년월일 * <span className="text-gray-400 font-normal">(8자리)</span>
              </label>
              <input
                id="birthDate"
                name="birthDate"
                required
                inputMode="numeric"
                placeholder="19690301"
                value={birthDate}
                onChange={handleBirthDateChange}
                maxLength={8}
                className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400">예: 19690301 (년월일)</p>
            </div>
          </div>

          {/* 전화번호 */}
          <div className="space-y-1.5">
            <label htmlFor="phone" className="text-sm font-medium">전화번호 * (로그인 ID)</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              placeholder="010-0000-0000"
              value={phone}
              onChange={handlePhoneChange}
              maxLength={13}
              inputMode="numeric"
              className="w-full h-10 px-3 rounded-md border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400">숫자만 입력해도 자동으로 - 가 추가됩니다</p>
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

          {/* 개인정보 동의 */}
          <div className="space-y-2 border-t pt-4">
            <p className="text-sm font-medium text-gray-700">개인정보 동의 *</p>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={agreePrivacy}
                onChange={e => setAgreePrivacy(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0"
              />
              <span className="text-sm text-gray-700 leading-relaxed">
                <strong>(필수)</strong> 개인정보 수집·이용에 동의합니다.{' '}
                <Link href="/privacy" target="_blank"
                  className="text-blue-600 hover:underline text-xs"
                  onClick={e => e.stopPropagation()}>
                  처리방침 보기
                </Link>
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={agreeHealth}
                onChange={e => setAgreeHealth(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0"
              />
              <span className="text-sm text-gray-700 leading-relaxed">
                <strong>(필수)</strong> 건강 관련 정보(돌봄 필요도)
                수집·이용에 동의합니다.
                <span className="block text-xs text-gray-400 mt-0.5">
                  서비스 제공자가 서비스 이용 중 관찰한 돌봄 필요 수준을 기록하는 데 사용됩니다.
                </span>
              </span>
            </label>

            {(!agreePrivacy || !agreeHealth) && (
              <p className="text-xs text-orange-600">
                ⚠️ 두 항목 모두 동의해야 가입이 가능합니다.
              </p>
            )}
          </div>

          {/* 오류 메시지 */}
          {state.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-4 py-3">
              {state.error}
            </div>
          )}

          <SubmitButton disabled={!agreePrivacy || !agreeHealth} />
        </form>

        <p className="text-center text-sm text-gray-500">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="text-blue-600 hover:underline font-medium">
            로그인
          </Link>
        </p>

        <p className="text-center text-xs text-gray-400">
          <Link href="/privacy" className="hover:underline hover:text-gray-600 transition-colors">
            개인정보 처리방침
          </Link>
        </p>
      </div>
    </div>
  )
}
