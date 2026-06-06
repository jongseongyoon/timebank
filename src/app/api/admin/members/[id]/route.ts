/**
 * GET  /api/admin/members/[id]  — 회원 상세
 * PATCH /api/admin/members/[id]  — 기본 정보 수정 + TP 조정
 */
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Role, MemberStatus, Prisma } from '@prisma/client'

// ── GET: 상세 ──────────────────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  const allowed = session.user.roles.some((r: string) => ['ADMIN', 'COORDINATOR'].includes(r))
  if (!allowed) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const member = await prisma.member.findUnique({
    where: { id: params.id },
    select: {
      id: true, createdAt: true, updatedAt: true,
      name: true, phone: true, email: true, dong: true,
      birthDate: true, address: true,
      roles: true, status: true, memberType: true,
      isVulnerable: true, isDisabled: true,
      tpBalance: true, lifetimeEarned: true, lifetimeSpent: true,
      tpExpiresAt: true, syncSource: true, lastSyncedAt: true,
      avgRating: true, ratingCount: true,
      organization: { select: { id: true, name: true } },
    },
  })

  if (!member) return NextResponse.json({ error: '회원 없음' }, { status: 404 })
  return NextResponse.json(member)
}

// ── PATCH: 수정 ───────────────────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  if (!session.user.roles.includes('ADMIN')) {
    return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({})) as {
    name?:      string
    phone?:     string
    dong?:      string
    birthDate?: string
    roles?:     Role[]
    status?:    MemberStatus
    tpAdjust?: {
      amount:    number
      direction: 'add' | 'subtract'
      reason:    string
    }
  }

  const member = await prisma.member.findUnique({ where: { id: params.id } })
  if (!member) return NextResponse.json({ error: '회원 없음' }, { status: 404 })

  // ── 기본 정보 업데이트 ───────────────────────────────────────────────────
  const updateData: Prisma.MemberUpdateInput = {}
  if (body.name      !== undefined) updateData.name      = body.name
  if (body.phone     !== undefined) updateData.phone     = body.phone
  if (body.dong      !== undefined) updateData.dong      = body.dong
  if (body.birthDate !== undefined) updateData.birthDate = body.birthDate.replace(/-/g, '')
  if (body.roles     !== undefined) updateData.roles     = { set: body.roles }
  if (body.status    !== undefined) updateData.status    = body.status

  // ── TP 잔액 조정 ──────────────────────────────────────────────────────────
  if (body.tpAdjust) {
    const { amount, direction, reason } = body.tpAdjust
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: '조정 금액이 올바르지 않습니다.' }, { status: 400 })
    }
    const tp = new Prisma.Decimal(amount)

    if (direction === 'add') {
      updateData.tpBalance      = { increment: tp }
      updateData.lifetimeEarned = { increment: tp }
    } else {
      if (member.tpBalance.lt(tp)) {
        return NextResponse.json({ error: 'TP 잔액이 부족합니다.' }, { status: 400 })
      }
      updateData.tpBalance     = { decrement: tp }
      updateData.lifetimeSpent = { increment: tp }
    }

    // 감사 로그
    await prisma.auditLog.create({
      data: {
        adminId:  session.user.id,
        action:   direction === 'add' ? 'TP_ADD' : 'TP_DEDUCT',
        targetId: params.id,
        details:  JSON.stringify({ amount, reason, memberName: member.name }),
      },
    })
  }

  const updated = await prisma.member.update({
    where: { id: params.id },
    data:  updateData,
    select: {
      id: true, name: true, phone: true, dong: true,
      birthDate: true, roles: true, status: true,
      tpBalance: true, lifetimeEarned: true, lifetimeSpent: true,
    },
  })

  // 기본 정보 변경 감사 로그
  const infoChanged = body.name || body.phone || body.dong || body.birthDate || body.roles || body.status
  if (infoChanged) {
    await prisma.auditLog.create({
      data: {
        adminId:  session.user.id,
        action:   'MEMBER_UPDATE',
        targetId: params.id,
        details:  JSON.stringify({ changed: Object.keys(body).filter(k => k !== 'tpAdjust') }),
      },
    })
  }

  return NextResponse.json(updated)
}
