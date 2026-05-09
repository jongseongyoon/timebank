/**
 * 빌드된 APK를 public/ 폴더로 복사 (APK 다운로드 버튼용)
 */
import { copyFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const ROOT = process.cwd()

const sources = [
  // debug APK
  resolve(ROOT, 'android/app/build/outputs/apk/debug/app-debug.apk'),
  // release APK
  resolve(ROOT, 'android/app/build/outputs/apk/release/app-release-unsigned.apk'),
  resolve(ROOT, 'android/app/build/outputs/apk/release/app-release.apk'),
]

const dest = resolve(ROOT, 'public/timepay.apk')

for (const src of sources) {
  if (existsSync(src)) {
    copyFileSync(src, dest)
    console.log(`✅ APK 복사 완료: ${src} → public/timepay.apk`)
    process.exit(0)
  }
}

console.error('❌ 빌드된 APK를 찾을 수 없습니다.')
console.error('   먼저 npm run apk:debug 또는 apk:release 를 실행하세요.')
process.exit(1)
