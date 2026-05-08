import webpush from 'web-push'
import { prisma } from '@/lib/prisma'

// VAPID 설정 (서버 초기화 시 1회)
webpush.setVapidDetails(
  process.env.VAPID_EMAIL ?? 'mailto:admin@timebank.kr',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '',
  process.env.VAPID_PRIVATE_KEY ?? ''
)

export interface PushPayload {
  title: string
  body: string
  link?: string
  icon?: string
  badge?: string
}

/**
 * 특정 회원의 모든 기기로 웹 푸시 전송
 * 만료된 구독은 자동 삭제
 */
export async function sendPushToMember(memberId: string, payload: PushPayload) {
  const subs = await prisma.pushSubscription.findMany({
    where: { memberId },
  })

  if (subs.length === 0) return

  const data = JSON.stringify({
    title: payload.title,
    body: payload.body,
    link: payload.link ?? '/',
    icon: payload.icon ?? '/icons/icon-192.svg',
    badge: payload.badge ?? '/icons/icon-192.svg',
  })

  const expiredIds: string[] = []

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          data,
          { TTL: 60 * 60 * 24 } // 24시간 TTL
        )
      } catch (err: any) {
        // 410 Gone or 404 = 구독 만료
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          expiredIds.push(sub.id)
        }
        console.error(`[web-push] 전송 실패 (${sub.id}):`, err?.message)
      }
    })
  )

  // 만료 구독 정리
  if (expiredIds.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { id: { in: expiredIds } },
    })
  }
}

/**
 * 여러 회원에게 동시 전송
 */
export async function sendPushToMembers(memberIds: string[], payload: PushPayload) {
  await Promise.allSettled(memberIds.map((id) => sendPushToMember(id, payload)))
}
