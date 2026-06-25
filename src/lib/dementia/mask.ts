/**
 * 치매 모니터링 — 마스킹 (명령서 §4.2)
 *
 * 목록은 항상 마스킹: 성명 "이○○", 생년월일코드 "48****".
 * 상세에서만 인증된 권한자에게 전체 노출.
 * record 본문은 목록에 절대 노출하지 않는다(상세 전용).
 */

/** 이순금 → 이○○ / 김갑 → 김○ / 외자/공백은 안전 처리 */
export function maskName(name: string): string {
  const n = (name ?? '').trim()
  if (!n) return '○○○'
  if (n.length === 1) return n + '○'
  return n[0] + '○'.repeat(n.length - 1)
}

/** 480115 → 48**** (앞 2자리=출생연도 추정만 노출) */
export function maskBirthCode(birthCode: string): string {
  const b = (birthCode ?? '').trim()
  if (!b) return '******'
  if (b.length <= 2) return b + '*'.repeat(Math.max(0, 6 - b.length))
  return b.slice(0, 2) + '*'.repeat(b.length - 2)
}

/** 이순금480115 → 이○○48**** */
export function maskPersonLabel(name: string, birthCode: string): string {
  return `${maskName(name)}${maskBirthCode(birthCode)}`
}
