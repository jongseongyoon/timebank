import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user.roles?.includes('ADMIN')) {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  }

  const batches = await prisma.storeImportBatch.findMany({
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { importer: { select: { name: true } } },
  })

  return NextResponse.json({ batches })
}
