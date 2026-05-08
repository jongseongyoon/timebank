# TimePay 최종 통합 개발 지시서

## 프로젝트 기본 정보
- 현재 배포 주소: https://timebank-mocha.vercel.app
- GitHub: https://github.com/jongseongyoon/timebank
- DB: Supabase (PostgreSQL)
- 프레임워크: Next.js 14 (App Router)
- 각 단계 완료 후 반드시 git push
- git push 후 Vercel 배포 확인 후 다음 단계 진행
- APK 관련 수정은 git push 후 npx cap sync android 추가 실행

---

## ⚠️ 0단계: TC → TP 용어 전면 교체 (최우선)

모든 다른 작업보다 먼저 실행한다.
프로젝트 전체(코드, UI, DB, 주석, 알림 메시지)에서
"TC(TimeCreditit)" 표현을 "TP(TimePay)"로 전면 교체한다.

### 코드 교체 대상

| 기존 | 변경 |
|------|------|
| TC | TP |
| 타임크레딧 | 타임페이 |
| tcBalance | tpBalance |
| tcAmount | tpAmount |
| tcEarned | tpEarned |
| tcPerHour | tpPerHour |
| tcEquivalent | tpEquivalent |
| TC 잔액 | TP 잔액 |
| TC 적립 | TP 적립 |
| TC 이전 | TP 이전 |
| TC 지갑 | TP 지갑 |
| TC 배분 | TP 배분 |
| 0.5 TC | 0.5 TP |

교체 범위: src/ 하위 모든 .tsx .ts 파일, prisma/schema.prisma, 환경변수명

### DB 컬럼명 변경
Supabase SQL 편집기에서 실행:
```sql
ALTER TABLE "Member" RENAME COLUMN "tcBalance" TO "tpBalance";
ALTER TABLE "Member" RENAME COLUMN "lifetimeEarned" TO "lifetimeEarned";
ALTER TABLE "Transaction" RENAME COLUMN "tcAmount" TO "tpAmount";
ALTER TABLE "ServiceListing" RENAME COLUMN "tcPerHour" TO "tpPerHour";
ALTER TABLE "FundTransaction" RENAME COLUMN "tcEquivalent" TO "tpEquivalent";
```

완료 후 git push → Vercel 배포 확인.

---

## 1단계: 앱 이름 변경 + PWA 중복 알림 제거

### 1-1. 앱 이름 TimePay로 통일
모든 파일에서 "주민자치 타임뱅크" → "TimePay" 변경:
- src/app/layout.tsx
- src/app/(auth)/login/page.tsx
- src/app/(auth)/register/page.tsx
- public/manifest.json
- package.json

### 1-2. PWA 중복 설치 알림 제거
현재 "Timebank"와 "TimePay" 두 개의 설치 알림이 뜨는 문제 해결.

public/manifest.json:
```json
{
  "name": "TimePay",
  "short_name": "TimePay",
  "description": "시간으로 연결하는 주민 공동체",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b5bdb",
  "orientation": "portrait",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

public/sw.js 서비스워커 버전 v1 → v3 강제 업데이트:
```javascript
const CACHE_VERSION = 'timepay-v3'
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_VERSION)
            .map(key => caches.delete(key))
      )
    )
  )
})
```

public/icons/ 폴더에 SVG 기반으로 192x192, 512x512 PNG 아이콘 생성.
아이콘 디자인: 파란 원 배경에 흰색 시계 + 사람 실루엣.

모바일 접속 시 하단 "홈화면에 추가하기" 안내 배너 표시.
한 번 닫으면 7일간 표시 안 함 (localStorage 사용).

완료 후 git push → Vercel 배포 확인.

---

## 2단계: 모바일 반응형 + 하단 네비게이션

### 2-1. 모바일 반응형 완성
- 모든 페이지 375px~430px 스마트폰 화면 최적화
- 터치 버튼 최소 크기 56px (어르신 배려)
- 글자 최소 크기 16px

### 2-2. 하단 네비게이션 바
5개 탭 구성:
- 🏠 홈 → /
- 🤝 서비스 → /services
- 📷 QR스캔 → /scan (중앙, 크게 강조)
- 💬 커뮤니티 → /community
- 👤 내정보 → /profile

서비스 진행 중에는 하단 네비게이션 비활성화.

### 2-3. 스플래시 화면
앱 시작 시 TimePay 로고 1.5초 표시 후 로그인 화면으로 이동.

완료 후 git push → Vercel 배포 확인.

---

## 3단계: Capacitor APK 전환 + Google Fit 만보기

### 3-1. Capacitor 설치
```
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/app
npx cap init
```

### 3-2. capacitor.config.ts
```typescript
import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.timepay.gwangju',
  appName: 'TimePay',
  webDir: 'out',
  server: {
    url: 'https://timebank-mocha.vercel.app',
    cleartext: false,
    allowNavigation: ['timebank-mocha.vercel.app'],
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    useLegacyBridge: false,
  },
  plugins: {
    StepCounter: {},
  },
}
export default config
```

### 3-3. next.config.js 수정
```javascript
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true }
}
```

### 3-4. package.json 스크립트 추가
```json
"build:android": "next build && npx cap sync android",
"open:android": "npx cap open android"
```

### 3-5. Google Fit 만보기 연동
```
npm install @capacitor-community/google-fit
```

```typescript
// src/lib/walk-service.ts
import { GoogleFit } from '@capacitor-community/google-fit'

export async function getTodaySteps(): Promise<number> {
  await GoogleFit.requestPermission()
  const today = new Date()
  const startOfDay = new Date(today.setHours(0,0,0,0))
  const result = await GoogleFit.getStepCountData({
    startDate: startOfDay.toISOString(),
    endDate: new Date().toISOString()
  })
  return result.steps || 0
}

// 자정 이후 전날 걸음수 확인 → 10,000보 달성 시 0.5 TP 자동 적립
export async function checkAndAwardDailySteps(memberId: string) {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const dateStr = yesterday.toISOString().split('T')[0]

  const record = await prisma.walkRecord.findUnique({
    where: { memberId_date: { memberId, date: dateStr } }
  })

  if (record && record.stepCount >= 10000 && !record.goalAchieved) {
    await prisma.$transaction([
      prisma.member.update({
        where: { id: memberId },
        data: {
          tpBalance: { increment: 0.5 },
          lifetimeEarned: { increment: 0.5 }
        }
      }),
      prisma.walkRecord.update({
        where: { memberId_date: { memberId, date: dateStr } },
        data: { goalAchieved: true, tpEarned: 0.5 }
      }),
      prisma.transaction.create({
        data: {
          txType: 'COMMUNITY_BONUS',
          receiverId: memberId,
          tpAmount: 0.5,
          durationMinutes: 0,
          baseRate: 0.5,
          coordinatorId: 'admin-001',
          verificationMethod: 'APP_CONFIRM',
          txHash: `walk-${memberId}-${dateStr}`,
          status: 'APPROVED',
          note: `만보기 달성 TP 적립 (${record.stepCount}보)`
        }
      })
    ])
    return true
  }
  return false
}
```

앱 시작 시 + 매일 자정(00:01) 자동 실행:
```typescript
// 앱 시작 시 전날 미지급 TP 확인
useEffect(() => {
  checkAndAwardDailySteps(session.user.id)
}, [])

// 자정 타이머
useEffect(() => {
  const midnight = new Date()
  midnight.setHours(24, 1, 0, 0)
  const ms = midnight.getTime() - Date.now()
  const timer = setTimeout(() => {
    checkAndAwardDailySteps(session.user.id)
  }, ms)
  return () => clearTimeout(timer)
}, [])
```

### 3-6. 만보기 페이지 (/walk)
- Google Fit 연동 상태 표시 ("연결됨 ✓" / "연결 필요")
- "Google Fit 연결하기" 버튼
- 오늘 걸음수 크게 표시
- 목표(10,000보) 달성률 원형 프로그레스 바
- 10,000보 달성 시 축하 애니메이션 + 0.5 TP 자동 적립
- "오늘 걸음수 확인 및 TP 적립" 수동 버튼 추가
- 이번 달 걷기 TP 적립 내역

### 3-7. DB 수정
```sql
CREATE TABLE IF NOT EXISTS "WalkRecord" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  "memberId" TEXT NOT NULL REFERENCES "Member"("id"),
  "date" DATE NOT NULL,
  "stepCount" INT DEFAULT 0,
  "tpEarned" DECIMAL(4,2) DEFAULT 0,
  "goalAchieved" BOOLEAN DEFAULT FALSE,
  "tpAwardedAt" TIMESTAMP,
  "source" TEXT DEFAULT 'google_fit',
  UNIQUE("memberId", "date")
);
```

### 3-8. Android 권한 설정
android/app/src/main/AndroidManifest.xml:
```xml
<uses-permission android:name="android.permission.ACTIVITY_RECOGNITION"/>
<uses-permission android:name="com.google.android.gms.permission.ACTIVITY_RECOGNITION"/>
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
<uses-permission android:name="android.permission.CAMERA"/>
<uses-permission android:name="android.permission.VIBRATE"/>
```

완료 후 git push → npx cap sync android.

---

## 4단계: QR코드 시스템 + 세션 보호

### 4-1. 패키지 설치
```
npm install qrcode @zxing/library
```

### 4-2. DB 수정
```sql
ALTER TABLE "Member"
ADD COLUMN IF NOT EXISTS "qrCode" TEXT;

ALTER TABLE "Transaction"
ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "endedAt" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "sessionToken" TEXT,
ADD COLUMN IF NOT EXISTS "lastHeartbeat" TIMESTAMP;
```

### 4-3. 회원가입 시 QR코드 자동 생성
회원가입 완료 시 memberId를 QR코드로 인코딩하여 Member.qrCode 저장.

### 4-4. 내 QR코드 화면 (/wallet/qr)
- 내 QR코드 크게 표시
- 이름 + TP 잔액 + 별점 표시
- "QR 저장하기" 버튼 (이미지 다운로드)
- "QR 공유하기" 버튼

### 4-5. QR 스캔 페이지 (/scan)
- 카메라 권한 요청 (후면 카메라)
- 실시간 QR 스캔
- 스캔 성공 시 상대방 정보 표시 (이름, TP잔액, 별점)
- 선택: A. 서비스 시작  B. TP 직접 송금

### 4-6. 서비스 시작/종료 QR 방식
서비스 시작:
  상대방 QR 스캔 → 서비스 카테고리 선택 → "시작" 버튼
  → Transaction 생성 (status: IN_PROGRESS, startedAt: 현재시간)

서비스 종료:
  상대방 QR 재스캔 → "종료" 버튼
  → endedAt 기록 → 시간 자동 계산 → TP 자동 계산 → 완료

### 4-7. 서비스 카테고리 한국어 매핑 통일
```typescript
// src/lib/constants.ts

export const SERVICE_CATEGORY_MAP: Record<string, string> = {
  'TRANSPORT': '이동지원',
  'SHOPPING': '장보기',
  'COMPANION': '말벗',
  'MEAL': '식사지원',
  'HOUSEKEEPING': '가사지원',
  'MEDICAL_ESCORT': '의료동행',
  'EDUCATION': '교육',
  'DIGITAL_HELP': '디지털지원',
  'REPAIR': '수리',
  'CHILDCARE': '아이돌봄',
  'LEGAL_CONSULT': '법률상담',
  'HEALTH_CONSULT': '건강상담',
  'ADMINISTRATIVE': '행정업무보조',
  'COMMUNITY_EVENT': '공동체행사',
  'OTHER': '기타'
}

export function getCategoryLabel(category: string): string {
  return SERVICE_CATEGORY_MAP[category] || category
}
```

QR 스캔, 서비스 목록, 요청, 진행 화면 모두 getCategoryLabel() 통일 적용.

### 4-8. QR 서비스 세션 보호 (화면 전환 방지)

Zustand store에 activeSession 상태 추가:
```typescript
// src/store/session-store.ts
interface ActiveSession {
  transactionId: string
  providerId: string
  receiverId: string
  serviceCategory: string
  startedAt: Date
  providerName: string
  receiverName: string
}
```

서비스 진행 중 처리:
- 하단 네비게이션 바 비활성화
- 뒤로가기 버튼 차단
- 다른 페이지 이동 시도 시 경고 모달:
  "서비스가 진행 중입니다."
  버튼: [계속 진행] [서비스 종료 후 이동]
- localStorage에 activeSession 저장 (앱 재시작 시 복구)

뒤로가기 차단:
```typescript
useEffect(() => {
  if (activeSession) {
    window.history.pushState(null, '', window.location.href)
    window.onpopstate = () => {
      window.history.pushState(null, '', window.location.href)
      setShowExitWarning(true)
    }
  }
  return () => { window.onpopstate = null }
}, [activeSession])
```

화면 어디서든 상단 고정 배너 표시:
```
🔴 서비스 진행 중 | 홍길동님과 이동지원 | 00:15:32 경과 | [종료하기]
```

타이머는 항상 startedAt 기준으로 재계산:
```typescript
useEffect(() => {
  const interval = setInterval(() => {
    if (activeSession?.startedAt) {
      const elapsed = Math.floor(
        (Date.now() - new Date(activeSession.startedAt).getTime()) / 1000
      )
      setElapsedSeconds(elapsed)
    }
  }, 1000)
  return () => clearInterval(interval)
}, [activeSession])
```

화면 이탈 후 복귀 시 안내 메시지:
```
⚠️ 화면을 벗어난 동안에도 시간은 계속 흘렀습니다.
   실제 서비스 시간: 00:45:12 (서비스 시작 기준)
```

종료 화면에서 시간 정보 명시:
"서비스 시작: 14:30 / 종료: 15:20 / 실제 서비스 시간: 50분"

완료 후 git push → Vercel 배포 확인.

---

## 5단계: 별점 + 돌봄 필요도 평가 시스템

### 5-1. DB 수정
```sql
-- 별점
ALTER TABLE "Transaction"
ADD COLUMN IF NOT EXISTS "providerRating" INT CHECK ("providerRating" BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS "receiverRating" INT CHECK ("receiverRating" BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS "providerReview" TEXT,
ADD COLUMN IF NOT EXISTS "receiverReview" TEXT;

ALTER TABLE "Member"
ADD COLUMN IF NOT EXISTS "avgRating" DECIMAL(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "ratingCount" INT DEFAULT 0;

-- 돌봄 필요도
ALTER TABLE "Member"
ADD COLUMN IF NOT EXISTS "careLevel" INT DEFAULT 1
  CHECK ("careLevel" BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS "careLevelUpdatedAt" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "careLevelNote" TEXT;

CREATE TABLE IF NOT EXISTS "CareLevelRecord" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "memberId" TEXT NOT NULL REFERENCES "Member"("id"),
  "assessedBy" TEXT NOT NULL REFERENCES "Member"("id"),
  "previousLevel" INT,
  "newLevel" INT NOT NULL CHECK ("newLevel" BETWEEN 1 AND 5),
  "note" TEXT,
  "transactionId" TEXT REFERENCES "Transaction"("id")
);
```

### 5-2. 돌봄 필요도 척도 정의
```typescript
// src/lib/constants.ts 에 추가

export const CARE_LEVELS = [
  {
    level: 1,
    label: '자립',
    description: '혼자서 모든 일상생활 가능',
    color: '#2f9e44',
    bgColor: '#ebfbee',
    icon: '🟢',
    careNeeds: '정기적 안부 확인 정도'
  },
  {
    level: 2,
    label: '경도 의존',
    description: '일부 도움으로 생활 가능',
    color: '#74c0fc',
    bgColor: '#e7f5ff',
    icon: '🔵',
    careNeeds: '간헐적 도움 서비스 필요'
  },
  {
    level: 3,
    label: '중등도 의존',
    description: '대부분의 일상에 도움 필요',
    color: '#f59f00',
    bgColor: '#fff9db',
    icon: '🟡',
    careNeeds: '정기적 방문 서비스 필요'
  },
  {
    level: 4,
    label: '고도 의존',
    description: '거의 모든 활동에 도움 필요',
    color: '#fd7e14',
    bgColor: '#fff4e6',
    icon: '🟠',
    careNeeds: '집중적 돌봄 서비스 필요'
  },
  {
    level: 5,
    label: '완전 의존',
    description: '24시간 상시 돌봄 필요',
    color: '#e03131',
    bgColor: '#fff5f5',
    icon: '🔴',
    careNeeds: '전문 요양 서비스 연계 필요'
  }
]

export function getCareLevel(level: number) {
  return CARE_LEVELS.find(c => c.level === level) || CARE_LEVELS[0]
}

export function getCareStars(level: number): string {
  return '★'.repeat(level) + '☆'.repeat(5 - level)
}
```

### 5-3. CareLevelSelector 컴포넌트
```typescript
// src/components/care/CareLevelSelector.tsx
'use client'
import { useState } from 'react'
import { CARE_LEVELS, getCareStars } from '@/lib/constants'

interface Props {
  currentLevel?: number
  onSelect: (level: number) => void
  readOnly?: boolean
}

export function CareLevelSelector({ currentLevel = 1, onSelect, readOnly }: Props) {
  const [selected, setSelected] = useState(currentLevel)
  const [hovered, setHovered] = useState<number | null>(null)
  const displayLevel = hovered || selected
  const info = CARE_LEVELS.find(c => c.level === displayLevel)!

  return (
    <div style={{ padding: '16px' }}>
      <p style={{ fontSize: '14px', color: '#555', marginBottom: '12px', textAlign: 'center' }}>
        돌봄 필요도를 선택해주세요
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
        {CARE_LEVELS.map((care) => (
          <button
            key={care.level}
            type="button"
            disabled={readOnly}
            onClick={() => { setSelected(care.level); onSelect(care.level) }}
            onMouseEnter={() => setHovered(care.level)}
            onMouseLeave={() => setHovered(null)}
            style={{
              width: '56px', height: '56px', borderRadius: '50%',
              border: selected === care.level ? `3px solid ${care.color}` : '2px solid #e0e0e0',
              background: selected === care.level ? care.bgColor : 'white',
              fontSize: '26px', cursor: readOnly ? 'default' : 'pointer',
            }}
          >
            {care.icon}
          </button>
        ))}
      </div>
      <div style={{
        background: info.bgColor, border: `2px solid ${info.color}`,
        borderRadius: '12px', padding: '16px', textAlign: 'center'
      }}>
        <div style={{ fontSize: '26px', color: info.color, marginBottom: '6px', letterSpacing: '4px' }}>
          {getCareStars(info.level)}
        </div>
        <div style={{ fontSize: '18px', fontWeight: '700', color: info.color, marginBottom: '4px' }}>
          {info.level}단계 · {info.label}
        </div>
        <div style={{ fontSize: '14px', color: '#444', marginBottom: '8px' }}>
          {info.description}
        </div>
        <div style={{ fontSize: '13px', color: '#666', background: 'rgba(255,255,255,0.7)', borderRadius: '8px', padding: '8px 12px' }}>
          📋 {info.careNeeds}
        </div>
      </div>
    </div>
  )
}
```

### 5-4. CareLevelBadge 컴포넌트
```typescript
// src/components/care/CareLevelBadge.tsx
import { getCareLevel, getCareStars } from '@/lib/constants'

export function CareLevelBadge({ level, showStars = true, size = 'md' }: {
  level: number
  showStars?: boolean
  size?: 'sm' | 'md' | 'lg'
}) {
  const info = getCareLevel(level)
  const fontSize = size === 'sm' ? '12px' : size === 'lg' ? '16px' : '14px'
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      background: info.bgColor, border: `1px solid ${info.color}`,
      borderRadius: '20px', padding: size === 'sm' ? '3px 10px' : '6px 14px',
    }}>
      <span>{info.icon}</span>
      {showStars && <span style={{ color: info.color, fontSize: '13px' }}>{getCareStars(level)}</span>}
      <span style={{ color: info.color, fontWeight: '700', fontSize }}>
        {level}단계 · {info.label}
      </span>
    </div>
  )
}
```

### 5-5. 서비스 완료 후 평가 팝업
거래 완료 후 두 가지 평가:

A. 별점 평가 (★ 1~5점):
   - 상대방 서비스에 대한 만족도
   - 한 줄 후기 입력 (선택)

B. 돌봄 필요도 평가 (제공자만):
   - CareLevelSelector 컴포넌트 사용
   - 기존 마이너스 점수 표현 완전 제거

### 5-6. 프로필/회원/관리자 화면 표시 교체
기존 "건강점수: -3" 표현을 모두 CareLevelBadge 컴포넌트로 교체.
코디네이터 회원 목록: careLevel 높을수록 상단 배치 (우선순위 정렬).

관리자 대시보드 돌봄 필요도 분포 차트:
```
🟢 1단계(자립):        N명
🔵 2단계(경도 의존):   N명
🟡 3단계(중등도 의존): N명
🟠 4단계(고도 의존):   N명
🔴 5단계(완전 의존):   N명
```

완료 후 git push → Vercel 배포 확인.

---

## 6단계: 커뮤니티 + 관리자 기능 강화

### 6-1. DB 수정
```sql
CREATE TABLE IF NOT EXISTS "Post" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  "authorId" TEXT NOT NULL REFERENCES "Member"("id"),
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'general',
  "viewCount" INT DEFAULT 0,
  "likeCount" INT DEFAULT 0,
  "isPinned" BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS "Comment" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "postId" TEXT NOT NULL REFERENCES "Post"("id") ON DELETE CASCADE,
  "authorId" TEXT NOT NULL REFERENCES "Member"("id"),
  "content" TEXT NOT NULL,
  "likeCount" INT DEFAULT 0
);
```

### 6-2. 커뮤니티 페이지 (/community)
탭: 전체 / 공지 / 자유 / 거래후기 / 질문
게시글 목록에 작성자 이름 + TP잔액 + 별점(★) 표시.
좋아요, 댓글 기능.
관리자 공지 고정 기능.

API:
- GET/POST /api/community/posts
- GET /api/community/posts/[id]
- POST /api/community/posts/[id]/comments
- POST /api/community/posts/[id]/like

### 6-3. 관리자 TP 배분 (/admin/allocate)
- 회원 검색 (이름 또는 전화번호)
- 배분할 TP 수량 입력
- 배분 사유 입력
- 배분 시 관리자 계정 TP는 마이너스로 기록
- 대시보드에 "발행 총량 / 배분 완료 / 잔여" 표시

### 6-4. 엑셀 일괄 배분 (/admin/bulk-allocate)
```
npm install xlsx
```
- 엑셀 파일 업로드 (형식: 전화번호 | 이름 | TP수량 | 사유)
- 미리보기 테이블 표시 후 "일괄 처리" 버튼
- 처리 결과 엑셀 다운로드
- 엑셀 템플릿 다운로드 버튼

### 6-5. 관리자 거래 수정/삭제
- 모든 거래 내역 조회/수정/삭제
- 삭제 시 TP 자동 복구
- 수정/삭제 이력 로그 기록

### 6-6. 관리자 푸시 알림 (/admin/notifications)
브라우저 Notification API 사용:
- 알림 제목 + 내용 입력
- 발송 대상: 전체 / 동별 / 개인

완료 후 git push → Vercel 배포 확인.

---

## 7단계: 버그 수정 모음

### 7-1. 한글 키보드 전환 (갤럭시 구글 키보드)
모든 input, textarea에 추가:
```html
<input lang="ko" inputMode="text" />
<textarea lang="ko" />
```

android/app/src/main/res/xml/config.xml:
```xml
<preference name="DefaultLocale" value="ko_KR" />
```

android/app/src/main/AndroidManifest.xml activity 태그:
```xml
android:windowSoftInputMode="adjustResize"
```

### 7-2. 뒤로가기 버튼 앱 종료 문제
```typescript
// src/hooks/use-back-button.ts
import { App } from '@capacitor/app'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function useBackButton() {
  const router = useRouter()
  useEffect(() => {
    const handler = App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        router.back()
      } else {
        if (window.location.pathname === '/') {
          if (confirm('앱을 종료하시겠습니까?')) {
            App.exitApp()
          }
        } else {
          router.push('/')
        }
      }
    })
    return () => { handler.remove() }
  }, [router])
}
```
src/app/layout.tsx 에 useBackButton() 훅 적용.

### 7-3. 전화번호 중간 숫자 마스킹
```typescript
// src/lib/utils.ts
// 010-1234-5678 → 010-12**-5678
export function maskPhone(phone: string): string {
  if (!phone) return ''
  return phone.replace(/(\d{3})-(\d{2})(\d{2})-(\d{4})/, '$1-$2**-$4')
}
```
전화번호 표시 모든 컴포넌트에 maskPhone() 적용.
단, tel: 링크에는 원본 번호 유지.

### 7-4. 서비스 지역 "관외" 추가
```typescript
export const DONGS = [
  '양동', '양3동', '농성1동', '농성2동', '광천동',
  '유덕동', '치평동', '상무1동', '상무2동', '화정1동',
  '화정2동', '화정3동', '화정4동', '서창동', '금호1동',
  '금호2동', '풍암동', '동천동', '관외'
]
```
동 선택 드롭다운이 있는 모든 파일에 적용.

### 7-5. 돌봄 수요자 전화 연결 + 소통 정보
서비스 요청 시 추가 입력 항목:
- 희망 날짜/시간 선택
- 장소 입력 (현재 위치 버튼 또는 직접 입력)
- 구체적인 요구사항 텍스트 (예: 병원 동행, 무릎 불편)
- 전화 연락 허용 체크박스

```sql
ALTER TABLE "ServiceRequest"
ADD COLUMN IF NOT EXISTS "requestedTime" TEXT,
ADD COLUMN IF NOT EXISTS "locationName" TEXT,
ADD COLUMN IF NOT EXISTS "latitude" DECIMAL(10,7),
ADD COLUMN IF NOT EXISTS "longitude" DECIMAL(10,7),
ADD COLUMN IF NOT EXISTS "detailedNeeds" TEXT,
ADD COLUMN IF NOT EXISTS "contactAllowed" BOOLEAN DEFAULT FALSE;
```

매칭 성사 후 상세 페이지:
- 요청 내용 카드 (날짜/시간, 장소, 요구사항) 표시
- "전화하기" 버튼 크게 (초록색, 📞 아이콘, 56px 이상)
- "문자 보내기" 버튼 (sms: 링크)
- contactAllowed = true 인 경우에만 전화번호 표시

완료 후 git push → Vercel 배포 확인 → npx cap sync android.

---

## 전체 개발 순서 요약

```
0단계: TC → TP 용어 전면 교체
       → git push → Vercel 배포 확인

1단계: 앱 이름 TimePay + PWA 중복 알림 제거
       → git push → Vercel 배포 확인

2단계: 모바일 반응형 + 하단 네비게이션
       → git push → Vercel 배포 확인

3단계: Capacitor APK + Google Fit 만보기
       → git push → npx cap sync android

4단계: QR코드 시스템 + 세션 보호
       → git push → Vercel 배포 확인
       → 스마트폰 QR 테스트 필수

5단계: 별점 + 돌봄 필요도 평가 시스템
       → git push → Vercel 배포 확인

6단계: 커뮤니티 + 관리자 기능 강화
       → git push → Vercel 배포 확인

7단계: 버그 수정 모음
       → git push → Vercel 배포 확인
       → npx cap sync android → APK 재빌드
```

---

## 공통 원칙
- 모든 UI는 모바일 375px 기준
- 한국어 UI 유지
- 어르신 배려: 버튼 최소 56px, 글자 최소 16px, 단순하게
- TC 표현 완전 제거 → TP로만 표현
- 마이너스(-) 건강점수 표현 완전 제거 → 돌봄 필요도 5단계로만 표현
- 기존 DB는 ALTER TABLE로 컬럼 추가 (테이블 삭제 금지)
- 각 단계 완료 후 반드시 git push
- 배포 실패 시 즉시 오류 수정 후 재push
