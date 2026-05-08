'use client'

import { useBackButton } from '@/hooks/use-back-button'

/**
 * 안드로이드 뒤로가기 버튼 핸들러
 * Server Component인 layout.tsx에서 직접 훅을 쓸 수 없으므로
 * 이 Client Component를 layout에 삽입해 사용
 */
export function BackButtonHandler() {
  useBackButton()
  return null
}
