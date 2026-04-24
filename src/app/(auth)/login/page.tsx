'use client'

import { Suspense, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Coins, Loader2 } from 'lucide-react'

// useSearchParams를 쓰는 부분만 별도 컴포넌트로 분리
function RegisteredBanner() {
  const searchParams = useSearchParams()
  const registered = searchParams.get('registered') === '1'
  if (!registered) return null
  return (
    <div className="mb-4 bg-green-50 border border-green-200 text-green-800 text-sm rounded-md px-4 py-3">
      가입이 완료됐습니다. 로그인해 주세요.
    </div>
  )
}

function LoginForm() {
  const router = useRouter()
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
      router.push('/')
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="phone">전화번호</Label>
        <Input
          id="phone" type="tel" placeholder="010-0000-0000"
          value={phone} onChange={(e) => setPhone(e.target.value)}
          required autoComplete="tel"
        />
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
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
        로그인
      </Button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="bg-primary rounded-full p-3">
              <Coins className="h-8 w-8 text-white" aria-hidden="true" />
            </div>
          </div>
          <CardTitle className="text-2xl">TimePay</CardTitle>
          <CardDescription>전화번호와 비밀번호로 로그인하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={null}>
            <RegisteredBanner />
          </Suspense>
          <LoginForm />
          <div className="mt-4 text-center text-sm text-muted-foreground">
            계정이 없으신가요?{' '}
            <Link href="/register" className="text-primary hover:underline font-medium">
              회원가입
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
