import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// 회원별 동적 매니페스트 — 홈 화면에 추가하면 "본인 페이지"로 열리는 독립 앱
export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const token = params.token
  const member = await prisma.tomatoMember.findUnique({
    where: { qrToken: token },
    select: { name: true },
  })

  const manifest = {
    id: `com.tomato.member.${token}`,
    name: member ? `${member.name} · 토마토의료기` : '토마토의료기 내 포인트',
    short_name: '내 포인트',
    description: '토마토의료기 회원 포인트·관리기한 조회',
    lang: 'ko',
    start_url: `/tm/${token}`,
    scope: `/tm/${token}`,
    display: 'standalone',
    background_color: '#fef2f2',
    theme_color: '#dc2626',
    orientation: 'portrait-primary',
    icons: [
      { src: '/icons/tomato-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/tomato-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/tomato-icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }

  return new Response(JSON.stringify(manifest), {
    headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' },
  })
}
