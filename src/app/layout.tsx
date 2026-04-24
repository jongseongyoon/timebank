import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '주민자치 타임뱅크',
  description: '지역 주민 간 서비스 교환 플랫폼',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
