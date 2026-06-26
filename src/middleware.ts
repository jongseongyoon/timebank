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

  // 치매 모니터링 — 데이터 API는 직원만(하드 차단). 페이지는 레이아웃에서
  // 권한 없을 때 '코디 권한 필요' 안내 화면을 보여주므로 여기서 막지 않는다.
  if (pathname.startsWith('/api/monitoring')) {
    const allowed = ['COORDINATOR', 'ADMIN']
    if (!session.user.roles.some((r) => allowed.includes(r))) {
      return NextResponse.json({ error: '권한 없음' }, { status: 403 })
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
