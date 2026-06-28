// 알리고(Aligo) 문자 발송 래퍼.
// 실제 발송은 요금이 발생하므로 testMode(testmode_yn=Y) 기본 사용 권장.
// 환경변수: ALIGO_API_KEY, ALIGO_USER_ID, ALIGO_SENDER

export type SmsSendResult =
  | { ok: true; success: number; fail: number }
  | { ok: false; error: string }

function onlyDigits(s: string) {
  return s.replace(/[^0-9]/g, '')
}

export async function sendAligoSms(params: {
  receivers: string[]
  message: string
  testMode: boolean
  title?: string
}): Promise<SmsSendResult> {
  const key = process.env.ALIGO_API_KEY
  const userId = process.env.ALIGO_USER_ID
  const sender = process.env.ALIGO_SENDER
  if (!key || !userId || !sender) {
    return {
      ok: false,
      error: 'Aligo 환경변수(ALIGO_API_KEY / ALIGO_USER_ID / ALIGO_SENDER)가 설정되지 않았습니다.',
    }
  }

  const receivers = Array.from(new Set(params.receivers.map(onlyDigits).filter((p) => p.length >= 10)))
  if (!receivers.length) return { ok: false, error: '유효한 수신 번호가 없습니다.' }
  if (receivers.length > 1000) return { ok: false, error: '한 번에 1,000명까지 발송할 수 있습니다.' }

  const body = new URLSearchParams()
  body.set('key', key)
  body.set('user_id', userId)
  body.set('sender', sender)
  body.set('receiver', receivers.join(','))
  body.set('msg', params.message)
  body.set('testmode_yn', params.testMode ? 'Y' : 'N')
  // 90바이트 초과 시 LMS로 자동 전환되며, title은 LMS 제목으로 사용됨
  if (params.title) body.set('title', params.title)

  try {
    const res = await fetch('https://apis.aligo.in/send/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    const data: any = await res.json()
    if (Number(data?.result_code) > 0) {
      return {
        ok: true,
        success: Number(data.success_cnt ?? receivers.length),
        fail: Number(data.error_cnt ?? 0),
      }
    }
    return { ok: false, error: data?.message || '발송에 실패했습니다.' }
  } catch (e: any) {
    return { ok: false, error: '발송 요청 중 오류가 발생했습니다: ' + (e?.message ?? '') }
  }
}
