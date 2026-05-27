/**
 * 구글 시트 템플릿 자동 생성 유틸리티
 *
 * 사전 요구 환경변수:
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL  서비스 계정 이메일
 *   GOOGLE_PRIVATE_KEY            PEM 형식 개인키 (\\n → \n 자동 변환)
 *   GOOGLE_DRIVE_FOLDER_ID        생성된 시트를 넣을 드라이브 폴더 ID (선택)
 *   GOOGLE_SHARE_EMAIL            시트에 편집자(writer) 권한을 줄 Gmail 주소 (선택)
 *                                  ※ 서비스 계정이 만든 시트는 서비스 계정 My Drive에만 생성되므로
 *                                     이 값을 설정해야 관리자 Gmail에서 시트를 볼 수 있습니다.
 *                                  ※ 절대 'owner' 가 아닌 'writer' 로 부여합니다.
 *                                    (구글 정책상 서비스 계정 → 일반 사용자 소유권 이전 불가 → 403)
 */

import { google } from 'googleapis'
import { DONGS } from '@/lib/constants'

// ── 구글 API 인증 ─────────────────────────────────────────────────────────────
// google.auth.GoogleAuth({ credentials }) 방식은 내부 JWT 생성 시 scopes가
// assertion 에 포함되지 않는 케이스가 있어 403 이 발생할 수 있음.
// 서비스 계정에는 google.auth.JWT 를 직접 사용하는 것이 명세에 부합하는 방법.
function getGoogleAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const rawKey = process.env.GOOGLE_PRIVATE_KEY

  if (!email || !rawKey) {
    console.error('[google-auth] 환경변수 누락:', {
      hasEmail: !!email,
      hasKey:   !!rawKey,
    })
    throw new Error(
      '구글 서비스 계정 환경변수가 설정되지 않았습니다.\n' +
      'GOOGLE_SERVICE_ACCOUNT_EMAIL 과 GOOGLE_PRIVATE_KEY 를 Vercel에 추가하세요.'
    )
  }

  // \n 정규화: Vercel 환경변수는 리터럴 \n 으로 저장되는 경우가 있음
  let privateKey = rawKey
    .replace(/\\n/g, '\n')   // 리터럴 \\n → 실제 줄바꿈
    .replace(/\\r/g, '')     // 혼입된 \r 제거

  // PEM 헤더·푸터 직후 줄바꿈 보정
  privateKey = privateKey
    .replace(/(-----BEGIN [^-]+-----)([^\n])/g, '$1\n$2')
    .replace(/([^\n])(-----END [^-]+-----)/g,   '$1\n$2')

  const newlineCount = (privateKey.match(/\n/g) ?? []).length
  console.log('[google-auth] JWT 클라이언트 생성 —', {
    email,
    keyPreview:       privateKey.slice(0, 60).replace(/\n/g, '↵'),
    newlineCount,
    startsWithHeader: privateKey.startsWith('-----BEGIN'),
    endsWithFooter:   privateKey.trimEnd().endsWith('-----'),
  })

  // google.auth.JWT: 서비스 계정 전용 인증 클라이언트
  // scopes 배열이 JWT assertion 에 직접 포함되므로 403 스코프 문제가 없음
  return new google.auth.JWT({
    email,
    key:    privateKey,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',  // 시트 읽기/쓰기
      'https://www.googleapis.com/auth/drive',          // 파일 이동·권한 부여
    ],
  })
}

// ── 환경변수 설정 상태 확인 ───────────────────────────────────────────────────
export function getApiStatus() {
  return {
    hasServiceEmail: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    hasPrivateKey:   !!process.env.GOOGLE_PRIVATE_KEY,
    hasFolderId:     !!process.env.GOOGLE_DRIVE_FOLDER_ID,
    hasShareEmail:   !!process.env.GOOGLE_SHARE_EMAIL,
  }
}

// ── 단일 동 시트 생성 ─────────────────────────────────────────────────────────
export async function createDongSheet(dong: string): Promise<string> {
  if (!DONGS.includes(dong)) throw new Error(`유효하지 않은 동: ${dong}`)

  const jwtClient = getGoogleAuth()

  // authorize() 를 명시적으로 호출해 액세스 토큰을 미리 발급받는다.
  // 이 단계에서 인증 오류(잘못된 키, 스코프 등)가 즉시 표면화된다.
  try {
    await jwtClient.authorize()
    console.log('[createDongSheet] JWT authorize 완료 — 토큰 발급 성공')
  } catch (err: unknown) {
    const gErr = err as { code?: number; message?: string }
    console.error('[createDongSheet] JWT authorize 실패 — 인증 오류:', {
      code:    gErr?.code,
      message: gErr?.message,
    })
    throw new Error(`구글 인증 실패: [${gErr?.code ?? '?'}] ${gErr?.message ?? String(err)}`)
  }

  const sheets = google.sheets({ version: 'v4', auth: jwtClient })
  const drive  = google.drive({ version: 'v3', auth: jwtClient })

  console.log(`[createDongSheet] 시트 생성 시작 — dong: ${dong}`)

  // 1. 스프레드시트 생성
  let spreadsheet
  try {
    spreadsheet = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title:  `TimePay_${dong}_명단`,
          locale: 'ko_KR',
        },
        sheets: [{
          properties: {
            title:           '대상자 명단',
            gridProperties: { rowCount: 1000, columnCount: 8 },
          },
        }],
      },
    })
  } catch (err: unknown) {
    const gErr = err as { code?: number; message?: string; errors?: unknown[] }
    console.error('[createDongSheet] 스프레드시트 생성 실패:', {
      dong,
      code:    gErr?.code,
      message: gErr?.message,
      errors:  gErr?.errors,
    })
    throw new Error(
      `시트 생성 실패 (${dong}): [${gErr?.code ?? '?'}] ${gErr?.message ?? String(err)}`
    )
  }

  const spreadsheetId = spreadsheet.data.spreadsheetId!
  const sheetId       = spreadsheet.data.sheets![0].properties!.sheetId!
  console.log(`[createDongSheet] 스프레드시트 생성 완료 — id: ${spreadsheetId}`)

  // 2. 헤더 입력
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range:            '대상자 명단!A1:H1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [['이름', '전화번호', '생년월일', '동', '대상구분', '비고', '등록상태', 'TimePay ID']],
      },
    })
  } catch (err: unknown) {
    const gErr = err as { code?: number; message?: string }
    console.error('[createDongSheet] 헤더 입력 실패:', { spreadsheetId, code: gErr?.code, message: gErr?.message })
    throw err
  }

  // 3. 서식 · 유효성 검사 · 조건부 서식 일괄 설정
  try {
    await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [

        // ── 헤더 행 배경색(진한 파랑) + 흰 굵은 글씨 ───────────────────────
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
            cell: {
              userEnteredFormat: {
                backgroundColor:    { red: 0.086, green: 0.361, blue: 0.608 },
                textFormat:         { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true, fontSize: 11 },
                horizontalAlignment: 'CENTER',
                verticalAlignment:   'MIDDLE',
              },
            },
            fields: 'userEnteredFormat',
          },
        },

        // ── 헤더 행 높이 35px ────────────────────────────────────────────────
        {
          updateDimensionProperties: {
            range:      { sheetId, dimension: 'ROWS', startIndex: 0, endIndex: 1 },
            properties: { pixelSize: 35 },
            fields:     'pixelSize',
          },
        },

        // ── 열 너비 (A:80 B:130 C:110 D:90 E:90 F:150 G:90 H:120) ──────────
        ...([80, 130, 110, 90, 90, 150, 90, 120] as const).map((px, i) => ({
          updateDimensionProperties: {
            range:      { sheetId, dimension: 'COLUMNS' as const, startIndex: i, endIndex: i + 1 },
            properties: { pixelSize: px },
            fields:     'pixelSize',
          },
        })),

        // ── D열: 동 드롭다운 ─────────────────────────────────────────────────
        {
          setDataValidation: {
            range: { sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 3, endColumnIndex: 4 },
            rule: {
              condition:   { type: 'ONE_OF_LIST', values: DONGS.map(d => ({ userEnteredValue: d })) },
              showCustomUi: true,
              strict:       true,
            },
          },
        },

        // ── E열: 대상구분 드롭다운 ───────────────────────────────────────────
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

        // ── G열: 등록상태 드롭다운 (빈칸 허용) ──────────────────────────────
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

        // ── G열 조건부 서식: 완료 → 연한 초록 (#B6D7A8) ────────────────────
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

        // ── G열 조건부 서식: 수정 → 연한 노랑 (#FFE599) ────────────────────
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

        // ── G열 조건부 서식: 삭제 → 연한 빨강 (#EA9999) ────────────────────
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

        // ── 1행 고정 ─────────────────────────────────────────────────────────
        {
          updateSheetProperties: {
            properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
            fields:     'gridProperties.frozenRowCount',
          },
        },

        // ── H열(TimePay ID) 보호 (경고만) ────────────────────────────────────
        {
          addProtectedRange: {
            protectedRange: {
              range: { sheetId, startRowIndex: 1, endRowIndex: 1000, startColumnIndex: 7, endColumnIndex: 8 },
              description: 'TimePay 시스템 자동 입력 — 수동 편집 금지',
              warningOnly: true,
            },
          },
        },

        // ── 전체 테두리 ──────────────────────────────────────────────────────
        {
          updateBorders: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1000, startColumnIndex: 0, endColumnIndex: 8 },
            top:            { style: 'SOLID', color: { red: 0.8, green: 0.8, blue: 0.8 } },
            bottom:         { style: 'SOLID', color: { red: 0.8, green: 0.8, blue: 0.8 } },
            left:           { style: 'SOLID', color: { red: 0.8, green: 0.8, blue: 0.8 } },
            right:          { style: 'SOLID', color: { red: 0.8, green: 0.8, blue: 0.8 } },
            innerHorizontal:{ style: 'SOLID', color: { red: 0.9, green: 0.9, blue: 0.9 } },
            innerVertical:  { style: 'SOLID', color: { red: 0.9, green: 0.9, blue: 0.9 } },
          },
        },

      ],
    },
    })
  } catch (err: unknown) {
    const gErr = err as { code?: number; message?: string }
    console.error('[createDongSheet] 서식 일괄 설정 실패:', { spreadsheetId, code: gErr?.code, message: gErr?.message })
    throw err
  }

  // 4. 예시 데이터 1행 (2행)
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range:            '대상자 명단!A2:F2',
      valueInputOption: 'RAW',
      requestBody: {
        values: [['홍길동', '010-0000-0000', '1945-01-01', dong, '수요자', '(예시행 — 삭제 후 사용하세요)']],
      },
    })
  } catch (err: unknown) {
    const gErr = err as { code?: number; message?: string }
    console.error('[createDongSheet] 예시 데이터 입력 실패:', { spreadsheetId, code: gErr?.code, message: gErr?.message })
    throw err
  }

  // 5. 구글 드라이브 폴더로 이동 (설정된 경우)
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID
  if (folderId) {
    try {
      const file = await drive.files.get({ fileId: spreadsheetId, fields: 'parents' })
      const prevParents = (file.data.parents ?? []).join(',')
      await drive.files.update({
        fileId:        spreadsheetId,
        addParents:    folderId,
        removeParents: prevParents || undefined,
        requestBody:   {},
      })
      console.log(`[createDongSheet] 드라이브 폴더 이동 완료 — folderId: ${folderId}`)
    } catch (err: unknown) {
      const gErr = err as { code?: number; message?: string }
      // 폴더 이동 실패는 시트 생성 자체를 실패시키지 않고 경고만 출력
      console.warn('[createDongSheet] 드라이브 폴더 이동 실패 (시트는 생성됨):', {
        spreadsheetId,
        folderId,
        code:    gErr?.code,
        message: gErr?.message,
      })
    }
  }

  // 6. 관리자 Gmail에 편집자(writer) 권한 부여 (설정된 경우)
  //    ※ 서비스 계정이 만든 파일은 서비스 계정 My Drive에만 존재하므로
  //      GOOGLE_SHARE_EMAIL 을 설정하지 않으면 관리자가 시트를 볼 수 없습니다.
  //    ※ 'owner' 는 서비스 계정 → 일반 계정 이전 시 구글 정책상 403 발생.
  //       반드시 'writer' 를 사용합니다.
  const shareEmail = process.env.GOOGLE_SHARE_EMAIL
  if (shareEmail) {
    try {
      await drive.permissions.create({
        fileId:   spreadsheetId,
        // sendNotificationEmail: false 로 설정해 알림 이메일 생략
        sendNotificationEmail: false,
        requestBody: {
          type:         'user',
          role:         'writer',   // ← 반드시 'writer'. 'owner' 는 403
          emailAddress: shareEmail,
        },
      })
      console.log(`[createDongSheet] writer 권한 부여 완료 — ${shareEmail}`)
    } catch (err: unknown) {
      const gErr = err as { code?: number; message?: string }
      // 권한 부여 실패도 시트 생성 자체를 막지 않음 (경고만)
      console.warn('[createDongSheet] writer 권한 부여 실패 (시트는 생성됨):', {
        spreadsheetId,
        shareEmail,
        code:    gErr?.code,
        message: gErr?.message,
      })
    }
  } else {
    console.warn(
      '[createDongSheet] GOOGLE_SHARE_EMAIL 미설정 — 관리자 Gmail에서 시트를 직접 볼 수 없습니다. ' +
      'Vercel 환경변수에 GOOGLE_SHARE_EMAIL 을 추가하세요.'
    )
  }

  console.log(`[createDongSheet] 완료 — dong: ${dong}, spreadsheetId: ${spreadsheetId}`)
  return spreadsheetId
}

// ── 전체 동 시트 일괄 생성 ───────────────────────────────────────────────────
export interface DongSheetResult {
  dong:          string
  spreadsheetId: string
  url:           string
  ok:            boolean
  error?:        string
}

export async function createAllDongSheets(
  onProgress?: (done: number, total: number, dong: string) => void
): Promise<DongSheetResult[]> {
  const results: DongSheetResult[] = []

  for (let i = 0; i < DONGS.length; i++) {
    const dong = DONGS[i]
    try {
      onProgress?.(i, DONGS.length, dong)
      const spreadsheetId = await createDongSheet(dong)
      results.push({
        dong,
        spreadsheetId,
        url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
        ok:  true,
      })
    } catch (err: unknown) {
      results.push({
        dong,
        spreadsheetId: '',
        url:           '',
        ok:            false,
        error:         err instanceof Error ? err.message : String(err),
      })
    }

    // API 쿼터 방지: 1초 대기 (마지막 항목 제외)
    if (i < DONGS.length - 1) {
      await new Promise(r => setTimeout(r, 1000))
    }
  }

  return results
}

// ── DONGS 재내보내기 (외부에서 import 편의) ──────────────────────────────────
export { DONGS }
