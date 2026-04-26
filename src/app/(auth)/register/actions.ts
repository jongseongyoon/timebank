'use server'

import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { calculateTcExpiry } from '@/lib/tc-calculator'
import { registerSchema } from '@/lib/validations/member'

export type RegisterState = { error: string }

export async function registerAction(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const password = formData.get('password') as string
  const passwordConfirm = formData.get('passwordConfirm') as string

  if (password !== passwordConfirm) {
    return { error: '비밀번호가 일치하지 않습니다.' }
  }

  const roles = formData.getAll('roles') as string[]
  if (roles.length === 0) {
    return { error: '참여 유형을 하나 이상 선택하세요.' }
  }

  // 전화번호: 숫자만 입력된 경우 자동으로 하이픈 추가
  let phone = formData.get('phone') as string
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('010')) {
    phone = `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  }

  const raw = {
    name: formData.get('name') as string,
    phone,
    password,
    birthDate: formData.get('birthDate') as string,
    dong: formData.get('dong') as string,
    email: (formData.get('email') as string) || undefined,
    roles,
    isVulnerable: formData.get('isVulnerable') === 'on',
    isDisabled: formData.get('isDisabled') === 'on',
  }

  const parsed = registerSchema.safeParse(raw)
  if (!parsed.success) {
    const msgs = Object.values(parsed.error.flatten().fieldErrors).flat()
    return { error: msgs.join(' / ') }
  }

  const existing = await prisma.member.findUnique({ where: { phone: parsed.data.phone } })
  if (existing) {
    return { error: '이미 등록된 전화번호입니다.' }
  }

  // 생년월일로 나이 계산 (65세 이상 어르신 혜택)
  const birthYear = parsed.data.birthDate
    ? parseInt(parsed.data.birthDate.slice(0, 4), 10)
    : 1970
  const isSenior = new Date().getFullYear() - birthYear >= 65

  const tcExpiresAt = calculateTcExpiry({
    registrationDate: new Date(),
    isSenior,
    isDisabled: parsed.data.isDisabled,
    isVulnerable: parsed.data.isVulnerable,
  })

  const passwordHash = await bcrypt.hash(parsed.data.password, 12)

  await prisma.member.create({
    data: {
      phone: parsed.data.phone,
      passwordHash,
      name: parsed.data.name,
      birthDate: parsed.data.birthDate ?? undefined,
      dong: parsed.data.dong,
      email: parsed.data.email,
      isVulnerable: parsed.data.isVulnerable,
      isDisabled: parsed.data.isDisabled,
      roles: parsed.data.roles as any,
      tcExpiresAt,
    },
  })

  redirect('/login?registered=1')
}
