/**
 * 치매 모니터링 — 한글 검색 (성명/코드/초성 부분일치) (명령서 §3.1.2)
 */

const CHO = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
]

/** 한글 문자열 → 초성 문자열 (예: 이순금 → ㅇㅅㄱ) */
export function toChosung(s: string): string {
  let out = ''
  for (const ch of s) {
    const code = ch.charCodeAt(0)
    if (code >= 0xac00 && code <= 0xd7a3) {
      out += CHO[Math.floor((code - 0xac00) / 588)]
    } else {
      out += ch
    }
  }
  return out
}

/**
 * 검색어가 인물과 매칭되는가.
 * - 성명 부분일치
 * - 생년월일코드 부분일치
 * - 성명생년월일(personKey) 부분일치
 * - 초성 일치 (검색어가 모두 초성일 때)
 */
export function matchPerson(
  query: string,
  name: string,
  birthCode: string,
  personKey: string,
): boolean {
  const q = query.trim()
  if (!q) return true
  const qLower = q.toLowerCase()

  if (name.toLowerCase().includes(qLower)) return true
  if (birthCode.includes(q)) return true
  if (personKey.toLowerCase().includes(qLower)) return true

  // 초성 검색: 검색어가 초성으로만 이뤄졌으면 이름 초성과 비교
  if (/^[ㄱ-ㅎ]+$/.test(q) && toChosung(name).includes(q)) return true

  return false
}
