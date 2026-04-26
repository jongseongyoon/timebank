export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { registerSchema } from '@/lib/validations/member'
import { calculateTcExpiry } from '@/lib/tc-calculator'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = registerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { phone, password, name, birthDate, dong, address, email, isVulnerable, isDisabled, roles } = parsed.data

    const existing = await prisma.member.findUnique({ where: { phone } })
    if (existing) {
      return NextResponse.json({ error: '이미 등록된 전화번호입니다.' }, { status: 409 })
    }

    const birthYear = birthDate ? parseInt(birthDate.slice(0, 4), 10) : 1970
    const isSenior = new Date().getFullYear() - birthYear >= 65
    const tcExpiresAt = calculateTcExpiry({
      registrationDate: new Date(),
      isSenior,
      isDisabled,
      isVulnerable,
    })

    const passwordHash = await bcrypt.hash(password, 12)
    const id = crypto.randomUUID()
    const qrCode = `timepay:member:${id}`

    const member = await prisma.member.create({
      data: {
        id,
        phone,
        passwordHash,
        name,
        birthDate,
        dong,
        address,
        email,
        isVulnerable,
        isDisabled,
        roles,
        tcExpiresAt,
        qrCode,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        dong: true,
        roles: true,
        tcExpiresAt: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ member }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
