/**
 * POST /api/admin/sheet-setup/create
 * 마스터 시트에 동 탭 추가 (ADMIN 전용)
 *
 * body: { mode: 'single' | 'all', dong?: string }
 */
export const dynamic    = 'force-dynamic'
export const maxDuration = 300  // 전체 동 일괄 생성은 최대 5분

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  createDongSheet,
  createAllDongSheets,
  getApiStatus,
  DONGS,
} from '@/lib/google-sheets-creator'

export async function POST(req: NextRequest) {
  // ── 인증 (ADMIN 전용) ──────────────────────────────────────────────────────
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  if (!session.user.roles.includes('ADMIN')) {
    return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 })
  }

  // ── 환경변수 확인 ──────────────────────────────────────────────────────────
  const apiStatus = getApiStatus()
  if (!apiStatus.hasServiceEmail || !apiStatus.hasPrivateKey) {
    return NextResponse.json(
      { error: '구글 서비스 계정 환경변수(GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY)가 설정되지 않았습니다.' },
      { status: 503 },
    )
  }
  if (!apiStatus.hasMasterSheetId) {
    return NextResponse.json(
      { error: 'GOOGLE_MASTER_SHEET_ID 환경변수가 설정되지 않았습니다. Vercel에 마스터 시트 ID를 추가하세요.' },
      { status: 503 },
    )
  }

  const body = await req.json().catch(() => ({}))
  const { mode, dong } = body as { mode?: string; dong?: string }

  try {
    // ── 단일 동 탭 추가 ────────────────────────────────────────────────────
    if (mode === 'single') {
      if (!dong || !DONGS.includes(dong)) {
        return NextResponse.json({ error: '올바른 동 이름이 아닙니다.' }, { status: 400 })
      }

      const { sheetId, url } = await createDongSheet(dong)

      // SystemConfig 에 탭 URL 저장
      await prisma.systemConfig.upsert({
        where:  { key: `SHEET_URL_${dong}` },
        update: { value: url, updatedBy: session.user.id },
        create: { key: `SHEET_URL_${dong}`, value: url, updatedBy: session.user.id },
      })

      return NextResponse.json({ success: true, mode: 'single', dong, url, sheetId })
    }

    // ── 전체 동 탭 일괄 추가 ───────────────────────────────────────────────
    if (mode === 'all') {
      const results = await createAllDongSheets()

      // 성공한 탭만 DB 저장
      for (const r of results) {
        if (r.ok && r.url) {
          await prisma.systemConfig.upsert({
            where:  { key: `SHEET_URL_${r.dong}` },
            update: { value: r.url, updatedBy: session.user.id },
            create: { key: `SHEET_URL_${r.dong}`, value: r.url, updatedBy: session.user.id },
          })
        }
      }

      const succeeded = results.filter(r => r.ok).length
      const failed    = results.filter(r => !r.ok).length

      return NextResponse.json({
        success: true,
        mode:    'all',
        total:   results.length,
        succeeded,
        failed,
        results,
      })
    }

    return NextResponse.json({ error: 'mode는 single 또는 all 이어야 합니다.' }, { status: 400 })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '탭 생성 중 오류가 발생했습니다.'
    console.error('[sheet-setup/create] 오류:', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
