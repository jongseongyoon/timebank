/**
 * POST /api/admin/sheet-import/preview
 * 구글 시트 가져오기 미리보기 — 처리 결과 예측 (실제 DB 변경 없음)
 */
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  getSheetCsvUrl,
  parseSheetCsv,
  validateRow,
  normalizePhone,
} from '@/lib/google-sheet'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: '인증 필요' }, { status: 401 })

  const isAdminOrCoord = session.user.roles.some((r: string) =>
    ['ADMIN', 'COORDINATOR'].includes(r)
  )
  if (!isAdminOrCoord) {
    return NextResponse.json({ error: '관리자 또는 코디네이터 권한 필요' }, { status: 403 })
  }

  const body = await req.json()
  const { sheetUrl } = body as { sheetUrl?: string }

  if (!sheetUrl?.trim()) {
    return NextResponse.json({ error: '구글 시트 URL을 입력하세요.' }, { status: 400 })
  }

  try {
    // 1. 구글 시트 CSV 읽기
    const csvUrl = getSheetCsvUrl(sheetUrl.trim())
    const response = await fetch(csvUrl, { next: { revalidate: 0 } })
    if (!response.ok) {
      throw new Error(
        '구글 시트를 읽을 수 없습니다. ' +
        '시트를 "링크 있는 누구나 — 뷰어" 또는 특정 사용자에게 공유했는지 확인해주세요.'
      )
    }

    const csvText = await response.text()
    if (!csvText.trim()) {
      return NextResponse.json({ error: '시트가 비어있습니다.' }, { status: 400 })
    }

    // 2. CSV 파싱
    const rows = parseSheetCsv(csvText)
    if (rows.length === 0) {
      return NextResponse.json({ error: '데이터 행이 없습니다. 헤더 행만 있는지 확인하세요.' }, { status: 400 })
    }

    // 3. 각 행 분석 (실제 DB 조회로 신규/기존 판단)
    const preview = await Promise.all(
      rows.map(async (row) => {
        const error = validateRow(row)
        if (error) return { ...row, action: 'ERROR' as const, error }

        const phone = normalizePhone(row.phone)

        // G열 '삭제' → 비활성화 예정
        if (row.status === '삭제') {
          const existing = await prisma.member.findUnique({
            where: { phone },
            select: { id: true, name: true },
          })
          return {
            ...row, phone,
            action: existing ? 'DELETE' as const : 'ERROR' as const,
            timepayId: existing?.id ?? '',
            error: existing ? null : '삭제 대상인데 등록된 회원을 찾을 수 없음',
          }
        }

        // 기존 회원 조회
        const existing = await prisma.member.findUnique({
          where: { phone },
          select: { id: true, name: true },
        })

        // G열 '수정' → 기존 회원 정보 업데이트
        if (row.status === '수정') {
          return {
            ...row, phone,
            action: existing ? 'UPDATE' as const : 'ERROR' as const,
            timepayId: existing?.id ?? '',
            error: existing ? null : '수정 대상인데 등록된 회원을 찾을 수 없음',
          }
        }

        // 기존 회원 없음 → 신규 등록
        if (!existing) {
          return { ...row, phone, action: 'CREATE' as const, error: null }
        }

        // 이미 등록됨 (G열 = '완료' 이거나 빈칸이지만 phone 일치)
        return {
          ...row, phone,
          action: 'SKIP' as const,
          timepayId: existing.id,
          error: null,
        }
      })
    )

    // 4. 통계
    const stats = {
      total:  preview.length,
      create: preview.filter(r => r.action === 'CREATE').length,
      update: preview.filter(r => r.action === 'UPDATE').length,
      delete: preview.filter(r => r.action === 'DELETE').length,
      skip:   preview.filter(r => r.action === 'SKIP').length,
      error:  preview.filter(r => r.action === 'ERROR').length,
    }

    return NextResponse.json({ preview, stats })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '오류가 발생했습니다.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
