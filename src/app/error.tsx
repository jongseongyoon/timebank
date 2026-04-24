'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function GlobalError({
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
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center p-8">
      <h2 className="text-xl font-semibold">오류가 발생했습니다</h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        {error.message || '예기치 않은 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'}
      </p>
      <Button onClick={reset} size="sm" variant="outline">다시 시도</Button>
    </div>
  )
}
