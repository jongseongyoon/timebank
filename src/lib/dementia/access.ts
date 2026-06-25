/**
 * 치매 모니터링 — 접근통제 + 접근 로그 (명령서 §4.1, §4.5)
 *
 * 인증된 직원(ADMIN/COORDINATOR)만. 미인증/권한없음은 데이터 응답 자체 차단.
 * 누가/언제/어떤 personKey 를 조회·검색·내보냈는지 서버 로그로 남긴다.
 * (옵션 B 도입 시 DB 테이블로 승격)
 */

import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

/** 모니터링 앱 접근 허용 역할(직원) */
export const MONITORING_ROLES = ['ADMIN', 'COORDINATOR'] as const

export interface StaffSession {
  userId: string
  name: string
  roles: string[]
}

/**
 * 라우트 가드. 통과 시 StaffSession, 실패 시 NextResponse(401/403).
 * 사용: const guard = await requireStaff(); if (guard instanceof NextResponse) return guard
 */
export async function requireStaff(): Promise<StaffSession | NextResponse> {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  }
  const roles = session.user.roles ?? []
  if (!roles.some((r) => (MONITORING_ROLES as readonly string[]).includes(r))) {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  }
  return { userId: session.user.id, name: session.user.name ?? '', roles }
}

/** 접근 로그 (구조화 콘솔 로그 — Vercel 로그에서 검색 가능) */
export function logAccess(
  staff: StaffSession,
  action: 'list' | 'search' | 'detail' | 'followups' | 'export',
  detail: Record<string, unknown> = {},
) {
  console.log(
    '[monitoring-access]',
    JSON.stringify({
      at: new Date().toISOString(),
      userId: staff.userId,
      name: staff.name,
      action,
      ...detail,
    }),
  )
}
