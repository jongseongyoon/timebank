import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.timepay.gwangju',
  appName: 'TimePay',
  webDir: 'out',
  // 웹 서버가 Vercel에 배포된 경우 아래 server.url 사용
  // 로컬 개발 시에는 주석 처리 후 정적 빌드(out/) 사용
  server: {
    url: 'https://timebank-mocha.vercel.app',
    cleartext: false,
    allowNavigation: ['timebank-mocha.vercel.app'],
  },
  android: {
    allowMixedContent: false,
    // captureInput: true 를 제거 → GBoard 조합 이벤트 차단 문제 수정
    // Samsung 키보드는 windowSoftInputMode="adjustResize" 로 대응
    useLegacyBridge: false,
    // 만보기: ACTIVITY_RECOGNITION 권한 필요 (Android 10+)
    // AndroidManifest.xml 에 자동 추가됨
  },
  plugins: {
    // 만보기 플러그인 설정
    StepCounter: {},
  },
}

export default config
