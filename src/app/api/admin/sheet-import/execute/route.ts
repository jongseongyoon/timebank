/**
 * POST /api/admin/sheet-import/execute
 * 구글 시트 가져오기 실행 — 실제 DB 반영
 */
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'
import bcrypt from 'bcryptjs'
import {
  getSheetCsvUrl,
  parseSheetCsv,
  validateRow,
  normalizePhone,
  parseRole,
  getTempPassword,
  calcTpExpiresAt,
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
  const {
    sheetUrl,
    dong,
    skipErrors = true,  // true: 오류 행 건너뜀, false: 전체 처리 시도
  } = body as { sheetUrl?: string; dong?: string; skipErrors?: boolean }

  if (!sheetUrl?.trim()) {
    return NextResponse.json({ error: '구글 시트 URL을 입력하세요.' }, { status: 400 })
  }
  if (!dong?.trim()) {
    return NextResponse.json({ error: '동을 선택하세요.' }, { status: 400 })
  }

  const coordinatorId = session.user.id

  const results = {
    created: 0,
    updated: 0,
    deleted: 0,
    skipped: 0,
    errors:  [] as { row: number; name: string; reason: string }[],
  }

  try {
    // 1. 구글 시트 CSV 읽기
    const csvUrl = getSheetCsvUrl(sheetUrl.trim())
    const response = await fetch(csvUrl, { next: { revalidate: 0 } })
    if (!response.ok) {
      throw new Error('구글 시트를 읽을 수 없습니다. 공유 설정을 확인해주세요.')
    }

    const csvText  = await response.text()
    const rows     = parseSheetCsv(csvText)

    // 2. 행별 처리
    for (const row of rows) {
      try {
        // 유효성 검사
        const validErr = validateRow(row)
        if (validErr) {
          results.errors.push({ row: row.rowIndex, name: row.name || '(이름없음)', reason: validErr })
          if (!skipErrors) continue
          continue
        }

        const phone    = normalizePhone(row.phone)
        const roles    = parseRole(row.role) as Role[]
        const existing = await prisma.member.findUnique({ where: { phone } })

        // ── 삭제(비활성화) ───────────────────────────────────────────────────
        if (row.status === '삭제') {
          if (!existing) {
            results.errors.push({ row: row.rowIndex, name: row.name, reason: '등록된 회원 없음' })
            continue
          }
          await prisma.member.update({
            where: { phone },
            data: { status: 'WITHDRAWN', lastSyncedAt: new Date() },
          })
          results.deleted++
          continue
        }

        // ── 수정 ──────────────────────────────────────────────────────────────
        if (row.status === '수정' && existing) {
          await prisma.member.update({
            where: { phone },
            data: {
              name:         row.name,
              birthDate:    row.birthDate.replace(/-/g, ''),  // YYYYMMDD
              dong:         row.dong,
              roles,
              lastSyncedAt: new Date(),
              sheetRowId:   `${dong}_${row.rowIndex}`,
            },
          })
          results.updated++
          continue
        }

        // ── 신규 등록 ─────────────────────────────────────────────────────────
        if (!existing) {
          const tempPw   = getTempPassword(row.birthDate)
          const hashedPw = await bcrypt.hash(tempPw, 10)
          const tpExpiresAt = calcTpExpiresAt(row.birthDate)

          const newMember = await prisma.member.create({
            data: {
              name:         row.name,
              phone,
              birthDate:    row.birthDate.replace(/-/g, ''),  // YYYYMMDD 저장
              dong:         row.dong,
              roles,
              passwordHash: hashedPw,
              memberType:   'INDIVIDUAL',
              status:       'ACTIVE',
              isVulnerable: row.note.includes('취약') || row.note.includes('독거') || row.note.includes('저소득'),
              isDisabled:   row.note.includes('장애'),
              tpBalance:    1.0,         // 가입 증여 1 TP
              lifetimeEarned: 1.0,
              tpExpiresAt,
              syncSource:   'SHEET',
              lastSyncedAt: new Date(),
              sheetRowId:   `${dong}_${row.rowIndex}`,
            },
          })

          // 가입 증여 1 TP Transaction 기록
          await prisma.transaction.create({
            data: {
              txType:             'FREE_ALLOCATION',
              receiverId:         newMember.id,
              tpAmount:           1.0,
              durationMinutes:    0,
              baseRate:           1.0,
              coordinatorId,
              verificationMethod: 'COORDINATOR',
              txHash:             `join-sheet-${newMember.id}-${Date.now()}`,
              status:             'APPROVED',
              completedAt:        new Date(),
              note:               `구글 시트 가져오기 — 가입 증여 1 TP (${dong})`,
            },
          })

          results.created++
          continue
        }

        // ── 건너뜀 (이미 등록됨) ──────────────────────────────────────────────
        results.skipped++

      } catch (rowErr: unknown) {
        const reason = rowErr instanceof Error ? rowErr.message : '처리 중 오류'
        results.errors.push({ row: row.rowIndex, name: row.name || '(이름없음)', reason })
      }
    }

    // 3. 동기화 이력 저장
    await prisma.googleSheetSync.create({
      data: {
        syncedBy:     coordinatorId,
        dong,
        sheetUrl:     sheetUrl.trim(),
        totalRows:    rows.length,
        newCount:     results.created,
        updateCount:  results.updated,
        deleteCount:  results.deleted,
        errorCount:   results.errors.length,
        errorDetails: results.errors.length > 0
          ? (results.errors as unknown as import('@prisma/client').Prisma.InputJsonValue)
          : undefined,
        status:       results.errors.length === 0
          ? 'SUCCESS'
          : results.created + results.updated + results.deleted > 0
            ? 'PARTIAL'
            : 'FAILED',
      },
    })

    return NextResponse.json({ success: true, results })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '처리 중 오류가 발생했습니다.'

    // 실패 이력도 기록
    try {
      await prisma.googleSheetSync.create({
        data: {
          syncedBy:  coordinatorId,
          dong:      dong ?? '',
          sheetUrl:  sheetUrl?.trim() ?? '',
          totalRows: 0,
          status:    'FAILED',
          errorDetails: [{ reason: msg }] as unknown as import('@prisma/client').Prisma.InputJsonValue,
        },
      })
    } catch {}

    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
