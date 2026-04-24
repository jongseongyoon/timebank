export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export async function GET() {
  const session = await auth()
  if (!session?.user.roles.includes('ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const configs = await prisma.systemConfig.findMany({ orderBy: { key: 'asc' } })
  return NextResponse.json({ configs })
}

const patchSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
})

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user.roles.includes('ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { key, value } = parsed.data

  const config = await prisma.systemConfig.upsert({
    where: { key },
    update: { value, updatedBy: session.user.id },
    create: { key, value, updatedBy: session.user.id },
  })

  return NextResponse.json({ config })
}
