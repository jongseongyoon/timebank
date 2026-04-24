export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  fundTxType: z.enum(['CONTRIBUTION', 'PRIVATE_PAYMENT', 'EMERGENCY_SERVICE', 'VULNERABLE_ALLOC', 'REFUND']),
  tcEquivalent: z.number().min(0),
  cashAmount: z.number().min(0),
  description: z.string().min(1),
  externalVendor: z.string().nullable().optional(),
  externalReceipt: z.string().nullable().optional(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user.roles.includes('ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const transactions = await prisma.fundTransaction.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return NextResponse.json({ transactions })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user.roles.includes('ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { fundTxType, tcEquivalent, cashAmount, description, externalVendor, externalReceipt } = parsed.data

  const tx = await prisma.fundTransaction.create({
    data: {
      fundTxType,
      tcEquivalent,
      cashAmount,
      description,
      externalVendor: externalVendor ?? null,
      externalReceipt: externalReceipt ?? null,
      approvedBy: [session.user.id],
    },
  })

  return NextResponse.json({ transaction: tx }, { status: 201 })
}
