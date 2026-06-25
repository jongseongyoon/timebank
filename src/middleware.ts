import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  if (!session) {
    // 로그인 후 원래 경로로 복귀 (착한쿠폰 PWA 등 별도 진입점 지원)
    const loginUrl = new URL('/login', req.url)
    if (pathname && pathname !== '/') loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (pathname.startsWith('/admin')) {
    if (!session.user.roles.includes('ADMIN')) {
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  if (pathname.startsWith('/coordinator')) {
    const allowed = ['COORDINATOR', 'ADMIN']
    if (!session.user.roles.some((r) => allowed.includes(r))) {
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  // 치매 모니터링 조회 — 인증된 직원만 (명령서 §4.1)
  if (pathname.startsWith('/monitoring') || pathname.startsWith('/api/monitoring')) {
    const allowed = ['COORDINATOR', 'ADMIN']
    if (!session.user.roles.some((r) => allowed.includes(r))) {
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  // 공개 경로(/login, /register, /api/auth, /fund-status, /api/fund-status)와 정적 파일은 미들웨어를 타지 않음
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|coupon-manifest.json|monitoring-manifest.json|sw.js|login|register|api/auth|fund-status|api/fund-status|offline|api/social-prescription/fund-status).*)',
  ],
}
