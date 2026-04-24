import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const SERVICE_LABEL: Record<string, string> = {
  TRANSPORT: '이동지원', SHOPPING: '장보기', COMPANION: '말벗',
  MEAL: '식사지원', HOUSEKEEPING: '가사지원', MEDICAL_ESCORT: '의료동행',
  EDUCATION: '교육', DIGITAL_HELP: '디지털지원', REPAIR: '수리',
  CHILDCARE: '아이돌봄', LEGAL_CONSULT: '법률상담', HEALTH_CONSULT: '건강상담',
  ADMINISTRATIVE: '행정보조', COMMUNITY_EVENT: '공동체행사', OTHER: '기타',
}

const TX_STATUS: Record<string, string> = {
  PENDING: '대기', APPROVED: '승인', CANCELLED: '취소', DISPUTED: '분쟁', RESOLVED: '해결',
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user.roles.includes('ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const days = Number(req.nextUrl.searchParams.get('days') ?? '30')
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const txs = await prisma.transaction.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
    include: {
      provider: { select: { name: true, dong: true } },
      receiver: { select: { name: true, dong: true } },
      coordinator: { select: { name: true } },
      serviceListing: { select: { category: true } },
    },
    take: 5000,
  })

  const header = ['거래ID', '날짜', '상태', '제공자', '수요자', '코디네이터', '서비스유형', 'TC량', '시간(분)', '확인방법', '메모']
  const rows = txs.map((tx) => [
    tx.id,
    tx.createdAt.toISOString().slice(0, 10),
    TX_STATUS[tx.status] ?? tx.status,
    tx.provider?.name ?? '',
    tx.receiver?.name ?? '',
    tx.coordinator?.name ?? '',
    SERVICE_LABEL[tx.serviceListing?.category ?? ''] ?? tx.serviceListing?.category ?? '',
    Number(tx.tcAmount).toFixed(2),
    tx.durationMinutes,
    tx.verificationMethod,
    (tx.note ?? '').replace(/"/g, '""'),
  ])

  const bom = '\uFEFF'
  const csv = bom + [header, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="timebank-${since.toISOString().slice(0, 10)}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
