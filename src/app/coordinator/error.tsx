'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function CoordinatorError({
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
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
      <h2 className="text-xl font-semibold">코디네이터 페이지 오류</h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        {error.message || '페이지를 불러오는 중 오류가 발생했습니다.'}
      </p>
      <Button onClick={reset} size="sm" variant="outline">다시 시도</Button>
    </div>
  )
}
