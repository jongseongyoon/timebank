/**
 * Vercel API로 환경변수 추가
 * VERCEL_TOKEN 환경변수가 필요합니다
 */
const TOKEN = process.env.VERCEL_TOKEN
const PROJECT_ID = process.env.VERCEL_PROJECT_ID  // vercel.json 또는 .vercel/project.json

if (!TOKEN) {
  console.error('VERCEL_TOKEN 환경변수를 설정하세요')
  process.exit(1)
}

const vars = [
  { key: 'NEXT_PUBLIC_VAPID_PUBLIC_KEY', value: 'BL9fkBh7QwPZ7-1grMzT_8XWdQRcWWFmBkp27HvgAJG6Y-gajRf-WRceXC6m1qg2MlL0VcWdilY8Q6qq-2g15aw', type: 'plain' },
  { key: 'VAPID_PRIVATE_KEY', value: 'i6knhzSPWpiLJbo0W3N0HeVg67DbBfwJUdP3ZC7O39w', type: 'sensitive' },
  { key: 'VAPID_EMAIL', value: 'mailto:admin@timebank.kr', type: 'plain' },
]

console.log('Vercel 환경변수 추가 방법:')
console.log('Vercel 대시보드 → 프로젝트 → Settings → Environment Variables 에서 아래 값을 추가하세요:\n')
vars.forEach(v => {
  console.log(`Key:   ${v.key}`)
  console.log(`Value: ${v.value}`)
  console.log(`Scope: Production, Preview, Development`)
  console.log()
})
