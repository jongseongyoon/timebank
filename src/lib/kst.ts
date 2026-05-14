/**
 * 한국 표준시(KST = UTC+9) 날짜 헬퍼
 *
 * new Date().toISOString()은 UTC 기준이므로
 * KST 자정(00:00) ~ 09:00 사이에 날짜가 하루 어긋납니다.
 * 서버·클라이언트 모두 이 함수를 사용해야 일관성이 유지됩니다.
 */

/** 현재 KST 날짜 문자열 반환 (예: '2026-05-14') */
export function kstToday(): string {
  return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10)
}

/**
 * 클라이언트가 보낸 날짜가 KST 오늘/어제 범위인지 검증 후 반환
 * 범위 밖이면 KST 오늘 반환
 */
export function validateWalkDate(clientDate?: string): string {
  const today = kstToday()
  if (!clientDate || !/^\d{4}-\d{2}-\d{2}$/.test(clientDate)) return today

  const diffMs   = new Date(today).getTime() - new Date(clientDate).getTime()
  const diffDays = Math.floor(diffMs / 86400_000)

  // 오늘(0) 또는 어제(1)만 허용
  return diffDays >= 0 && diffDays <= 1 ? clientDate : today
}
