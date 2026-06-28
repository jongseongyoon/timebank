export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import QRCode from 'qrcode'
import { prisma } from '@/lib/prisma'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MemberActions } from '@/components/tomato/member-actions'
import { MemberQr } from '@/components/tomato/member-qr'
import { ArrowLeft } from 'lucide-react'

const TX_LABEL: Record<string, { text: string; cls: string }> = {
  earn: { text: '적립', cls: 'text-green-700' },
  redeem: { text: '사용', cls: 'text-red-700' },
  adjust: { text: '조정', cls: 'text-slate-700' },
}

function fmtDate(d: Date) {
  return d.toLocaleDateString('ko-KR')
}
function fmtDateTime(d: Date) {
  return d.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })
}

export default async function MemberDetailPage({ params }: { params: { id: string } }) {
  const member = await prisma.tomatoMember.findUnique({
    where: { id: params.id },
    include: {
      purchases: { include: { category: { select: { name: true } } }, orderBy: { purchaseDate: 'desc' } },
      pointTxs: { orderBy: { createdAt: 'desc' }, take: 100 },
    },
  })
  if (!member) notFound()

  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://timebank-mocha.vercel.app'
  const memberUrl = `${base}/tm/${member.qrToken}`
  // 회원 개인 페이지 URL을 QR로 — 폰 카메라로 열면 본인 조회, 직원 스캔도 동일 인식
  const qrDataUrl = await QRCode.toDataURL(memberUrl, { width: 240, margin: 1 })

  return (
    <div className="max-w-4xl space-y-5">
      <Link href="/tomato/members" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> 회원 목록
      </Link>

      {/* 회원 정보 */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{member.name}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                회원번호 {member.memberNo || '-'} · {member.phone || '연락처 없음'}
              </p>
              {member.address && <p className="text-sm text-muted-foreground">{member.address}</p>}
              {member.birthDate && <p className="text-sm text-muted-foreground">생년월일 {member.birthDate}</p>}
              {member.memo && <p className="text-sm text-muted-foreground mt-1">메모: {member.memo}</p>}
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-muted-foreground">보유 포인트</p>
              <p className="text-3xl font-bold text-red-700">{member.pointsBalance.toLocaleString()}P</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* QR 발급 */}
      <Card>
        <CardContent className="pt-5">
          <p className="font-semibold text-sm mb-3">회원 QR · 개인 링크</p>
          <MemberQr qrDataUrl={qrDataUrl} name={member.name} memberNo={member.memberNo} memberUrl={memberUrl} />
        </CardContent>
      </Card>

      {/* 포인트 사용·조정 */}
      <Card>
        <CardContent className="pt-5">
          <p className="font-semibold text-sm mb-3">포인트 사용 · 조정</p>
          <MemberActions memberId={member.id} balance={member.pointsBalance} />
        </CardContent>
      </Card>

      {/* 구매내역 */}
      <Card>
        <CardContent className="pt-5">
          <p className="font-semibold text-sm mb-3">구매내역 ({member.purchases.length})</p>
          {member.purchases.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">구매내역이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b text-left text-muted-foreground text-xs">
                    <th className="py-2 pr-3">구매일</th>
                    <th className="py-2 pr-3">제품</th>
                    <th className="py-2 pr-3 text-right">구매액</th>
                    <th className="py-2 pr-3 text-right">적립</th>
                    <th className="py-2 pr-3">관리기한</th>
                  </tr>
                </thead>
                <tbody>
                  {member.purchases.map((p) => (
                    <tr key={p.id} className="border-b">
                      <td className="py-2 pr-3 text-xs text-muted-foreground">{fmtDate(p.purchaseDate)}</td>
                      <td className="py-2 pr-3">
                        {p.category.name}
                        {p.productName && <span className="text-muted-foreground"> · {p.productName}</span>}
                      </td>
                      <td className="py-2 pr-3 text-right">{p.purchaseAmount.toLocaleString()}원</td>
                      <td className="py-2 pr-3 text-right text-green-700">+{p.pointsEarned.toLocaleString()}P</td>
                      <td className="py-2 pr-3 text-xs">{p.managementDueDate ? fmtDate(p.managementDueDate) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 포인트 원장 */}
      <Card>
        <CardContent className="pt-5">
          <p className="font-semibold text-sm mb-3">포인트 원장 (최근 100건)</p>
          {member.pointTxs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">거래 내역이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b text-left text-muted-foreground text-xs">
                    <th className="py-2 pr-3">일시</th>
                    <th className="py-2 pr-3">구분</th>
                    <th className="py-2 pr-3">사유</th>
                    <th className="py-2 pr-3">처리</th>
                    <th className="py-2 pr-3 text-right">증감</th>
                    <th className="py-2 pr-3 text-right">잔액</th>
                  </tr>
                </thead>
                <tbody>
                  {member.pointTxs.map((t) => {
                    const lb = TX_LABEL[t.type] ?? { text: t.type, cls: '' }
                    return (
                      <tr key={t.id} className="border-b">
                        <td className="py-2 pr-3 text-xs text-muted-foreground">{fmtDateTime(t.createdAt)}</td>
                        <td className="py-2 pr-3"><Badge variant="outline" className={lb.cls}>{lb.text}</Badge></td>
                        <td className="py-2 pr-3">{t.reason || '-'}</td>
                        <td className="py-2 pr-3 text-xs text-muted-foreground">{t.operator || '-'}</td>
                        <td className={'py-2 pr-3 text-right font-medium ' + (t.amount >= 0 ? 'text-green-700' : 'text-red-700')}>
                          {t.amount >= 0 ? '+' : ''}{t.amount.toLocaleString()}P
                        </td>
                        <td className="py-2 pr-3 text-right text-muted-foreground">{t.balanceAfter.toLocaleString()}P</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
