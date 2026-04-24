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

  const raw = {
    name: formData.get('name') as string,
    phone: formData.get('phone') as string,
    password,
    birthYear: Number(formData.get('birthYear')),
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

  const isSenior = new Date().getFullYear() - parsed.data.birthYear >= 65
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
      birthYear: parsed.data.birthYear,
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
