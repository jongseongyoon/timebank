export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const SETUP_KEY = 'admin_setup_done'

// 설정 완료 여부 확인
export async function GET() {
  const config = await prisma.systemConfig.findUnique({ where: { key: SETUP_KEY } })
  return NextResponse.json({ done: config?.value === 'true' })
}

// 최초 관리자 설정
export async function POST(req: NextRequest) {
  // 이미 완료됐으면 차단
  const config = await prisma.systemConfig.findUnique({ where: { key: SETUP_KEY } })
  if (config?.value === 'true') {
    return NextResponse.json({ error: '이미 설정이 완료됐습니다' }, { status: 403 })
  }

  const body = await req.json()
  const phone = (body.phone as string)?.trim()
  if (!phone) return NextResponse.json({ error: '전화번호를 입력하세요' }, { status: 400 })

  const member = await prisma.member.findUnique({ where: { phone } })
  if (!member) {
    return NextResponse.json({ error: `전화번호 ${phone} 로 가입된 회원이 없습니다` }, { status: 404 })
  }

  // 관리자 권한 부여
  await prisma.member.update({
    where: { phone },
    data: { roles: ['ADMIN', 'COORDINATOR'] },
  })

  // 설정 완료 플래그 저장 → 이후 접근 차단
  await prisma.systemConfig.upsert({
    where: { key: SETUP_KEY },
    update: { value: 'true', updatedBy: member.id },
    create: { key: SETUP_KEY, value: 'true', updatedBy: member.id },
  })

  return NextResponse.json({ ok: true, name: member.name, phone: member.phone })
}
