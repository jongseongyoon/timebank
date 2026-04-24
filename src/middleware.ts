import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url))
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

  return NextResponse.next()
})

export const config = {
  // 공개 경로(/login, /register, /api/auth)와 정적 파일은 미들웨어를 타지 않음
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|login|register|api/auth).*)',
  ],
}
