'use server'

import { addDays } from 'date-fns'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { sendAligoSms } from '@/lib/tomato/sms'

const ALERT_WINDOW_DAYS = 60

export type SmsScope = 'both' | 'overdue' | 'upcoming'
export type SmsResult =
  | { ok: true; targets: number; success: number; fail: number; testMode: boolean }
  | { error: string }

// 관리기한 대상자에게 안내 문자 발송. 수신자는 서버에서 직접 추출(클라이언트 번호 신뢰 안 함).
export async function sendDueDateSms(input: {
  scope: SmsScope
  message: string
  testMode: boolean
}): Promise<SmsResult> {
  const session = await auth()
  if (!session?.user?.roles?.includes('ADMIN')) return { error: '권한이 없습니다.' }

  const message = (input.message ?? '').trim()
  if (!message) return { error: '메시지를 입력하세요.' }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const windowEnd = addDays(today, ALERT_WINDOW_DAYS)

  const where =
    input.scope === 'overdue'
      ? { managementDueDate: { not: null, lt: today } }
      : input.scope === 'upcoming'
        ? { managementDueDate: { gte: today, lte: windowEnd } }
        : { managementDueDate: { not: null, lte: windowEnd } }

  const items = await prisma.tomatoPurchase.findMany({
    where,
    select: { member: { select: { phone: true } } },
  })
  const phones = Array.from(
    new Set(
      items
        .map((i) => i.member.phone)
        .filter((p): p is string => !!p && p.replace(/[^0-9]/g, '').length >= 10)
    )
  )
  if (!phones.length) return { error: '발송 대상(유효 전화번호)이 없습니다.' }

  const res = await sendAligoSms({
    receivers: phones,
    message,
    testMode: input.testMode,
    title: '토마토의료기 관리기한 안내',
  })
  if (!res.ok) return { error: res.error }
  return { ok: true, targets: phones.length, success: res.success, fail: res.fail, testMode: input.testMode }
}
