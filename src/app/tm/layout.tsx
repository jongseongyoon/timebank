import type { Metadata, Viewport } from 'next'

// 회원 본인용 조회 페이지(무로그인). 링크는 검색엔진에 노출하지 않음.
export const metadata: Metadata = {
  title: '토마토의료기 — 내 포인트',
  description: '토마토의료기 회원 포인트·관리기한 조회',
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, statusBarStyle: 'default', title: '토마토의료기' },
}

export const viewport: Viewport = {
  themeColor: '#dc2626',
  width: 'device-width',
  initialScale: 1,
}

export default function TmLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-red-50/40">{children}</div>
}
