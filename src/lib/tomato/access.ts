import { auth } from '@/lib/auth'

// 토마토의료기 관리 영역 접근 가능 역할: 관리자(ADMIN) + 코디네이터(직원, COORDINATOR)
export const TOMATO_ROLES: readonly string[] = ['ADMIN', 'COORDINATOR']

export function hasTomatoAccess(roles?: string[] | null) {
  return !!roles?.some((r) => TOMATO_ROLES.includes(r))
}

// 서버 액션용: 권한 확인 후 처리자 이름 반환(없으면 예외)
export async function requireTomatoOperator() {
  const session = await auth()
  if (!hasTomatoAccess(session?.user?.roles)) throw new Error('권한이 없습니다.')
  return session!.user.name ?? '직원'
}
