export const dynamic = 'force-dynamic'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import QRCode from 'qrcode'
import { addDays } from 'date-fns'
import { prisma } from '@/lib/prisma'
import { Stethoscope, QrCode, Smartphone } from 'lucide-react'

const ALERT_WINDOW_DAYS = 60

// 회원별 매니페스트 연결 + 아이콘 + 카카오톡/공유 미리보기(오픈그래프)
export async function generateMetadata({ params }: { params: { token: string } }): Promise<Metadata> {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://timebank-mocha.vercel.app'
  const title = '토마토의료기 — 내 포인트'
  const description = '내 포인트와 제품 관리기한을 확인하세요.'
  return {
    title,
    description,
    manifest: `/tm/${params.token}/manifest.webmanifest`,
    icons: {
      icon: [{ url: '/icons/tomato-icon-192.png', sizes: '192x192', type: 'image/png' }],
      apple: [{ url: '/icons/tomato-apple-touch.png', sizes: '180x180', type: 'image/png' }],
    },
    openGraph: {
      title,
      description,
      siteName: '토마토의료기',
      type: 'website',
      locale: 'ko_KR',
      url: `${base}/tm/${params.token}`,
      images: [{ url: `${base}/icons/tomato-icon-512.png`, width: 512, height: 512, alt: '토마토의료기' }],
    },
  }
}

function fmt(d: Date) {
  return d.toLocaleDateString('ko-KR')
}

const TX_LABEL: Record<string, string> = { earn: '적립', redeem: '사용', adjust: '조정' }

export default async function MemberSelfPage({ params }: { params: { token: string } }) {
  const member = await prisma.tomatoMember.findUnique({
    where: { qrToken: params.token },
    include: {
      purchases: { include: { category: { select: { name: true } } }, orderBy: { purchaseDate: 'desc' } },
      pointTxs: { orderBy: { createdAt: 'desc' }, take: 15 },
    },
  })
  if (!member) notFound()

  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://timebank-mocha.vercel.app'
  const qr = await QRCode.toDataURL(`${base}/tm/${member.qrToken}`, { width: 240, margin: 1 })

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const windowEnd = addDays(today, ALERT_WINDOW_DAYS)

  const dueItems = member.purchases
    .filter((p) => p.managementDueDate && p.managementDueDate <= windowEnd)
    .map((p) => {
      const due = p.managementDueDate as Date
      const overdue = due < today
      return { id: p.id, name: p.category.name, productName: p.productName, due, overdue }
    })

  return (
    <div className="max-w-md mx-auto px-4 py-5 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <div className="bg-red-600 rounded-full p-1.5">
          <Stethoscope className="h-5 w-5 text-white" aria-hidden="true" />
        </div>
        <div>
          <p className="font-bold leading-tight">토마토의료기</p>
          <p className="text-xs text-muted-foreground">내 포인트·관리기한</p>
        </div>
      </div>

      {/* 포인트 */}
      <div className="bg-white border rounded-2xl p-5 text-center">
        <p className="text-sm text-muted-foreground">{member.name}님 보유 포인트</p>
        <p className="text-4xl font-bold text-red-700 mt-1">{member.pointsBalance.toLocaleString()}P</p>
      </div>

      {/* 내 QR */}
      <div className="bg-white border rounded-2xl p-5 flex flex-col items-center">
        <p className="text-sm font-semibold flex items-center gap-1.5 mb-2">
          <QrCode className="h-4 w-4 text-red-600" aria-hidden="true" /> 내 회원 QR
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} alt="내 QR" className="w-44 h-44" />
        <p className="text-xs text-muted-foreground mt-2 text-center">
          매장에서 적립·사용할 때 이 화면(QR)을 보여주세요.
        </p>
      </div>

      {/* 관리기한 */}
      {dueItems.length > 0 && (
        <div className="bg-white border rounded-2xl p-5">
          <p className="text-sm font-semibold mb-3">관리기한 안내</p>
          <ul className="space-y-2">
            {dueItems.map((d) => (
              <li key={d.id} className="flex items-center justify-between text-sm">
                <span>
                  {d.name}
                  {d.productName && <span className="text-muted-foreground"> · {d.productName}</span>}
                </span>
                <span className={d.overdue ? 'text-red-700 font-semibold' : 'text-orange-600'}>
                  {fmt(d.due)} {d.overdue ? '(지남)' : '(임박)'}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground mt-3">점검·재구매는 매장으로 문의해 주세요.</p>
        </div>
      )}

      {/* 구매내역 */}
      {member.purchases.length > 0 && (
        <div className="bg-white border rounded-2xl p-5">
          <p className="text-sm font-semibold mb-3">구매내역</p>
          <ul className="divide-y">
            {member.purchases.slice(0, 10).map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                <span>
                  {p.category.name}
                  {p.productName && <span className="text-muted-foreground"> · {p.productName}</span>}
                  <span className="block text-xs text-muted-foreground">{fmt(p.purchaseDate)}</span>
                </span>
                <span className="text-green-700 text-xs">+{p.pointsEarned.toLocaleString()}P</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 포인트 내역 */}
      {member.pointTxs.length > 0 && (
        <div className="bg-white border rounded-2xl p-5">
          <p className="text-sm font-semibold mb-3">포인트 내역 (최근 15건)</p>
          <ul className="divide-y">
            {member.pointTxs.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-2 text-sm">
                <span>
                  {TX_LABEL[t.type] ?? t.type}
                  {t.reason && <span className="text-muted-foreground"> · {t.reason}</span>}
                  <span className="block text-xs text-muted-foreground">{t.createdAt.toLocaleDateString('ko-KR')}</span>
                </span>
                <span className={t.amount >= 0 ? 'text-green-700' : 'text-red-700'}>
                  {t.amount >= 0 ? '+' : ''}{t.amount.toLocaleString()}P
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 홈 화면 추가 안내 */}
      <div className="flex items-start gap-2 rounded-xl bg-red-100/60 border border-red-200 px-4 py-3 text-xs text-red-800">
        <Smartphone className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
        <span>
          이 화면을 <b>홈 화면에 추가</b>하면 앱처럼 바로 열 수 있어요. (브라우저 메뉴 → “홈 화면에 추가”)
        </span>
      </div>

      <p className="text-center text-xs text-muted-foreground pt-1 pb-6">
        토마토의료기 · 본 화면은 조회 전용입니다.
      </p>
    </div>
  )
}
