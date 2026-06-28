'use client'

import { Suspense, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Coins, Stethoscope, Loader2 } from 'lucide-react'

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`
}

// callbackUrl이 /tomato 로 시작하면 토마토의료기 브랜드로 표시
function getTheme(isTomato: boolean) {
  return isTomato
    ? {
        name: '토마토의료기',
        desc: '직원·관리자 로그인',
        Icon: Stethoscope,
        bg: 'from-red-50 to-rose-100',
        badge: 'bg-red-600',
        btn: 'w-full bg-red-600 hover:bg-red-700',
        link: 'text-red-700',
      }
    : {
        name: 'TimePay',
        desc: '전화번호와 비밀번호로 로그인하세요',
        Icon: Coins,
        bg: 'from-blue-50 to-indigo-100',
        badge: 'bg-primary',
        btn: 'w-full',
        link: 'text-primary',
      }
}

function LoginInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // 로그인 후 복귀 경로(내부 경로만 허용 — 오픈 리다이렉트 방지)
  const rawCallback = searchParams?.get('callbackUrl') ?? ''
  const callbackUrl = rawCallback.startsWith('/') && !rawCallback.startsWith('//') ? rawCallback : '/'
  const isTomato = callbackUrl.startsWith('/tomato')
  const registered = searchParams?.get('registered') === '1'
  const t = getTheme(isTomato)

  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await signIn('credentials', { phone, password, redirect: false })
    if (res?.error) {
      setError('전화번호 또는 비밀번호가 올바르지 않습니다.')
      setLoading(false)
    } else {
      router.push(callbackUrl)
      router.refresh()
    }
  }

  return (
    <div className={`min-h-screen flex items-center justify-center bg-gradient-to-br ${t.bg} p-4`}>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className={`${t.badge} rounded-full p-3`}>
              <t.Icon className="h-8 w-8 text-white" aria-hidden="true" />
            </div>
          </div>
          <CardTitle className="text-2xl">{t.name}</CardTitle>
          <CardDescription>{t.desc}</CardDescription>
        </CardHeader>
        <CardContent>
          {registered && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-800 text-sm rounded-md px-4 py-3">
              가입이 완료됐습니다. 로그인해 주세요.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">전화번호</Label>
              <Input
                id="phone" type="tel" placeholder="010-0000-0000"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                maxLength={13}
                inputMode="numeric"
                required autoComplete="tel"
              />
              <p className="text-xs text-gray-400">숫자만 입력해도 자동으로 - 가 추가됩니다</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password" type="password" placeholder="비밀번호 입력"
                value={password} onChange={(e) => setPassword(e.target.value)}
                required autoComplete="current-password"
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                {error}
              </p>
            )}
            <Button type="submit" className={t.btn} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              로그인
            </Button>
          </form>

          {isTomato ? (
            <div className="mt-4 text-center text-xs text-muted-foreground">
              직원 계정이 필요하면 회원가입 후 관리자에게 코디네이터 권한을 요청하세요.{' '}
              <Link href="/register" className={`${t.link} hover:underline font-medium`}>회원가입</Link>
            </div>
          ) : (
            <div className="mt-4 text-center text-sm text-muted-foreground">
              계정이 없으신가요?{' '}
              <Link href="/register" className={`${t.link} hover:underline font-medium`}>회원가입</Link>
            </div>
          )}

          <div className="mt-3 text-center">
            <Link href="/privacy" className="text-xs text-gray-400 hover:text-gray-600 hover:underline transition-colors">
              개인정보 처리방침
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <LoginInner />
    </Suspense>
  )
}
