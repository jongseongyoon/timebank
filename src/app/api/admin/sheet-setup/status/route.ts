/**
 * GET /api/admin/sheet-setup/status
 * 동별 구글 시트 URL + 마지막 동기화 시간 조회 (ADMIN/COORDINATOR 전용)
 */
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getApiStatus, DONGS } from '@/lib/google-sheets-creator'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const isAdminOrCoord = session.user.roles.some((r: string) =>
    ['ADMIN', 'COORDINATOR'].includes(r)
  )
  if (!isAdminOrCoord) {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  }

  // ── 시트 URL (SystemConfig) ────────────────────────────────────────────────
  const sheetConfigs = await prisma.systemConfig.findMany({
    where: { key: { startsWith: 'SHEET_URL_' } },
  })
  const urlMap: Record<string, { url: string; updatedAt: string }> = {}
  for (const c of sheetConfigs) {
    const dong = c.key.replace('SHEET_URL_', '')
    urlMap[dong] = { url: c.value, updatedAt: c.updatedAt.toISOString() }
  }

  // ── 마지막 동기화 (GoogleSheetSync) ──────────────────────────────────────
  const lastSyncs = await prisma.googleSheetSync.findMany({
    where:   { status: { not: 'FAILED' } },
    orderBy: { createdAt: 'desc' },
    distinct: ['dong'],
    select:  { dong: true, createdAt: true, newCount: true, totalRows: true },
  })
  const syncMap: Record<string, { syncedAt: string; newCount: number; totalRows: number }> = {}
  for (const s of lastSyncs) {
    syncMap[s.dong] = {
      syncedAt: s.createdAt.toISOString(),
      newCount: s.newCount,
      totalRows: s.totalRows,
    }
  }

  // ── 동별 통합 상태 ────────────────────────────────────────────────────────
  const dongStatus = DONGS.map(dong => ({
    dong,
    sheetUrl:  urlMap[dong]?.url    ?? null,
    createdAt: urlMap[dong]?.updatedAt ?? null,
    lastSync:  syncMap[dong] ?? null,
  }))

  return NextResponse.json({
    apiStatus:  getApiStatus(),
    dongStatus,
  })
}
