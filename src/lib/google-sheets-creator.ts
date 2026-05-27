/**
 * 구글 시트 탭 생성 유틸리티 (마스터 시트 방식)
 *
 * 동작 방식:
 *   개인 계정이 미리 만들어 둔 마스터 스프레드시트 안에
 *   동 이름으로 새 탭(워크시트)을 추가하고 헤더·서식·템플릿을 세팅합니다.
 *   서비스 계정(로봇)은 마스터 시트에 편집자로 초대된 상태여야 합니다.
 *
 * 필수 환경변수:
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL  서비스 계정 이메일
 *   GOOGLE_PRIVATE_KEY            PEM 개인키 (\\n → \n 자동 변환)
 *   GOOGLE_MASTER_SHEET_ID        마스터 스프레드시트 ID
 *                                  (URL 중 /d/{여기}/edit 부분)
 */

import { google } from 'googleapis'
import { DONGS } from '@/lib/constants'

// ── 구글 API 인증 (JWT 방식 · Sheets 스코프만) ───────────────────────────────
function getGoogleAuth() {
  const email  = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const rawKey = process.env.GOOGLE_PRIVATE_KEY

  if (!email || !rawKey) {
    console.error('[google-auth] 환경변수 누락:', { hasEmail: !!email, hasKey: !!rawKey })
    throw new Error('GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY 가 설정되지 않았습니다.')
  }

  // Vercel 환경변수에서 리터럴 \n → 실제 줄바꿈
  let privateKey = rawKey.replace(/\\n/g, '\n').replace(/\\r/g, '')

  // PEM 헤더·푸터 직후 줄바꿈 보정
  privateKey = privateKey
    .replace(/(-----BEGIN [^-]+-----)([^\n])/g, '$1\n$2')
    .replace(/([^\n])(-----END [^-]+-----)/g,   '$1\n$2')

  console.log('[google-auth] JWT 클라이언트 생성 —', {
    email,
    newlineCount:     (privateKey.match(/\n/g) ?? []).length,
    startsWithHeader: privateKey.startsWith('-----BEGIN'),
  })

  return new google.auth.JWT({
    email,
    key:    privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

// ── 환경변수 설정 상태 확인 ───────────────────────────────────────────────────
export function getApiStatus() {
  return {
    hasServiceEmail:  !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    hasPrivateKey:    !!process.env.GOOGLE_PRIVATE_KEY,
    hasMasterSheetId: !!process.env.GOOGLE_MASTER_SHEET_ID,
  }
}

// ── 단일 동 탭 생성 결과 타입 ─────────────────────────────────────────────────
export interface CreateDongSheetResult {
  sheetId: number
  url:     string
}

// ── 단일 동 탭 생성 ──────────────────────────────────────────────────────────
export async function createDongSheet(dong: string): Promise<CreateDongSheetResult> {
  if (!DONGS.includes(dong)) throw new Error(`유효하지 않은 동: ${dong}`)

  const masterSheetId = process.env.GOOGLE_MASTER_SHEET_ID
  if (!masterSheetId) {
    throw new Error('GOOGLE_MASTER_SHEET_ID 환경변수가 설정되지 않았습니다.')
  }

  // ── JWT 인증 ─────────────────────────────────────────────────────────────
  const jwtClient = getGoogleAuth()
  try {
    await jwtClient.authorize()
    console.log('[createDongSheet] JWT authorize 완료')
  } catch (err: unknown) {
    const gErr = err as { code?: number; message?: string }
    console.error('[createDongSheet] JWT authorize 실패:', { code: gErr?.code, message: gErr?.message })
    throw new Error(`구글 인증 실패: [${gErr?.code ?? '?'}] ${gErr?.message ?? String(err)}`)
  }

  const sheets = google.sheets({ version: 'v4', auth: jwtClient })

  // ── Step 1: 마스터 시트에 새 탭(워크시트) 추가 ─────────────────────────────
  let sheetId: number
  try {
    const addRes = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: masterSheetId,
      requestBody: {
        requests: [{
          addSheet: {
            properties: {
              title:          dong,
              gridProperties: { rowCount: 1000, columnCount: 8 },
            },
          },
        }],
      },
    })
    sheetId = addRes.data.replies![0].addSheet!.properties!.sheetId!
    console.log(`[createDongSheet] 탭 추가 완료 — dong: ${dong}, sheetId: ${sheetId}`)
  } catch (err: unknown) {
    const gErr = err as { code?: number; message?: string }
    console.error('[createDongSheet] 탭 추가 실패:', { dong, code: gErr?.code, message: gErr?.message })

    // 이미 같은 이름 탭이 존재하는 경우 명확한 안내
    const msg = gErr?.message ?? ''
    if (msg.includes('already exists') || msg.includes('이미 존재')) {
      throw new Error(`"${dong}" 탭이 마스터 시트에 이미 존재합니다. 기존 탭을 삭제 후 다시 시도하세요.`)
    }
    throw new Error(`탭 추가 실패 (${dong}): [${gErr?.code ?? '?'}] ${msg || String(err)}`)
  }

  // ── Step 2: 헤더 서식·드롭다운·조건부 서식·열 너비 일괄 설정 ────────────────
  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: masterSheetId,
      requestBody: {
        requests: [

          // 헤더 행 배경색(진한 파랑) + 흰 굵은 글씨
          {
            repeatCell: {
              range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
              cell: {
                userEnteredFormat: {
                  backgroundColor:     { red: 0.086, green: 0.361, blue: 0.608 },
                  textFormat:          { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true, fontSize: 11 },
                  horizontalAlignment: 'CENTER',
                  verticalAlignment:   'MIDDLE',
                },
              },
              fields: 'userEnteredFormat',
            },
          },

          // 헤더 행 높이 35px
          {
            updateDimensionProperties: {
              range:      { sheetId, dimension: 'ROWS', startIndex: 0, endIndex: 1 },
              properties: { pixelSize: 35 },
              fields:     'pixelSize',
            },
          },

          // 열 너비 (A:80 B:130 C:110 D:90 E:90 F:150 G:90 H:120)
          ...([80, 130, 110, 90, 90, 150, 90, 120] as const).map((px, i) => ({
            updateDimensionProperties: {
              range:      { sheetId, dimension: 'COLUMNS' as const, startIndex: i, endIndex: i + 1 },
              properties: { pixelSize: px },
              fields:     'pixelSize',
            },
          })),

          // D열: 동 드롭다운
          {
            setDataValidation: {
              range: { sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 3, endColumnIndex: 4 },
              rule: {
                condition:    { type: 'ONE_OF_LIST', values: DONGS.map(d => ({ userEnteredValue: d })) },
                showCustomUi: true,
                strict:       true,
              },
            },
          },

          // E열: 대상구분 드롭다운
          {
            setDataValidation: {
              range: { sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 4, endColumnIndex: 5 },
              rule: {
                condition:    { type: 'ONE_OF_LIST', values: [
                  { userEnteredValue: '수요자' },
                  { userEnteredValue: '제공자' },
                  { userEnteredValue: '둘다'   },
                ]},
                showCustomUi: true,
                strict:       true,
              },
            },
          },

          // G열: 등록상태 드롭다운 (빈칸 허용)
          {
            setDataValidation: {
              range: { sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 6, endColumnIndex: 7 },
              rule: {
                condition:    { type: 'ONE_OF_LIST', values: [
                  { userEnteredValue: '완료' },
                  { userEnteredValue: '수정' },
                  { userEnteredValue: '삭제' },
                ]},
                showCustomUi: true,
                strict:       false,
              },
            },
          },

          // G열 조건부 서식: 완료 → 연한 초록
          {
            addConditionalFormatRule: {
              rule: {
                ranges: [{ sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 6, endColumnIndex: 7 }],
                booleanRule: {
                  condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: '완료' }] },
                  format:    { backgroundColor: { red: 0.714, green: 0.843, blue: 0.659 } },
                },
              },
              index: 0,
            },
          },

          // G열 조건부 서식: 수정 → 연한 노랑
          {
            addConditionalFormatRule: {
              rule: {
                ranges: [{ sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 6, endColumnIndex: 7 }],
                booleanRule: {
                  condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: '수정' }] },
                  format:    { backgroundColor: { red: 1, green: 0.949, blue: 0.8 } },
                },
              },
              index: 1,
            },
          },

          // G열 조건부 서식: 삭제 → 연한 빨강
          {
            addConditionalFormatRule: {
              rule: {
                ranges: [{ sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 6, endColumnIndex: 7 }],
                booleanRule: {
                  condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: '삭제' }] },
                  format:    { backgroundColor: { red: 0.918, green: 0.6, blue: 0.6 } },
                },
              },
              index: 2,
            },
          },

          // 1행 고정
          {
            updateSheetProperties: {
              properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
              fields:     'gridProperties.frozenRowCount',
            },
          },

          // H열(TimePay ID) 보호 (경고만)
          {
            addProtectedRange: {
              protectedRange: {
                range: { sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 7, endColumnIndex: 8 },
                description: 'TimePay 시스템 자동 입력 — 수동 편집 금지',
                warningOnly: true,
              },
            },
          },

          // 전체 테두리
          {
            updateBorders: {
              range:           { sheetId, startRowIndex: 0, endRowIndex: 1000, startColumnIndex: 0, endColumnIndex: 8 },
              top:             { style: 'SOLID', color: { red: 0.8, green: 0.8, blue: 0.8 } },
              bottom:          { style: 'SOLID', color: { red: 0.8, green: 0.8, blue: 0.8 } },
              left:            { style: 'SOLID', color: { red: 0.8, green: 0.8, blue: 0.8 } },
              right:           { style: 'SOLID', color: { red: 0.8, green: 0.8, blue: 0.8 } },
              innerHorizontal: { style: 'SOLID', color: { red: 0.9, green: 0.9, blue: 0.9 } },
              innerVertical:   { style: 'SOLID', color: { red: 0.9, green: 0.9, blue: 0.9 } },
            },
          },

        ],
      },
    })
    console.log('[createDongSheet] 서식 설정 완료')
  } catch (err: unknown) {
    const gErr = err as { code?: number; message?: string }
    console.error('[createDongSheet] 서식 설정 실패:', { sheetId, code: gErr?.code, message: gErr?.message })
    throw err
  }

  // ── Step 3: 헤더 입력 ────────────────────────────────────────────────────
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId:    masterSheetId,
      range:            `${dong}!A1:H1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [['이름', '전화번호', '생년월일', '동', '대상구분', '비고', '등록상태', 'TimePay ID']],
      },
    })
    console.log('[createDongSheet] 헤더 입력 완료')
  } catch (err: unknown) {
    const gErr = err as { code?: number; message?: string }
    console.error('[createDongSheet] 헤더 입력 실패:', { code: gErr?.code, message: gErr?.message })
    throw err
  }

  // ── Step 4: 예시 데이터 (2행) ────────────────────────────────────────────
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId:    masterSheetId,
      range:            `${dong}!A2:F2`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [['홍길동', '010-0000-0000', '1945-01-01', dong, '수요자', '(예시행 — 삭제 후 사용하세요)']],
      },
    })
    console.log('[createDongSheet] 예시 데이터 입력 완료')
  } catch (err: unknown) {
    const gErr = err as { code?: number; message?: string }
    console.error('[createDongSheet] 예시 데이터 입력 실패:', { code: gErr?.code, message: gErr?.message })
    throw err
  }

  const url = `https://docs.google.com/spreadsheets/d/${masterSheetId}/edit#gid=${sheetId}`
  console.log(`[createDongSheet] 완료 — dong: ${dong}, url: ${url}`)
  return { sheetId, url }
}

// ── 전체 동 탭 일괄 생성 ─────────────────────────────────────────────────────
export interface DongSheetResult {
  dong:    string
  sheetId: number
  url:     string
  ok:      boolean
  error?:  string
}

export async function createAllDongSheets(
  onProgress?: (done: number, total: number, dong: string) => void,
): Promise<DongSheetResult[]> {
  const results: DongSheetResult[] = []

  for (let i = 0; i < DONGS.length; i++) {
    const dong = DONGS[i]
    try {
      onProgress?.(i, DONGS.length, dong)
      const { sheetId, url } = await createDongSheet(dong)
      results.push({ dong, sheetId, url, ok: true })
    } catch (err: unknown) {
      results.push({
        dong,
        sheetId: 0,
        url:     '',
        ok:      false,
        error:   err instanceof Error ? err.message : String(err),
      })
    }

    // API 쿼터 방지: 동 사이 1초 대기 (마지막 제외)
    if (i < DONGS.length - 1) {
      await new Promise(r => setTimeout(r, 1000))
    }
  }

  return results
}

// ── DONGS 재내보내기 ──────────────────────────────────────────────────────────
export { DONGS }
