# TimePay 앱 2차 개발 지시서 (최종)

## 프로젝트 기본 정보
- 현재 배포 주소: https://timebank-mocha.vercel.app
- GitHub: https://github.com/jongseongyoon/timebank
- DB: Supabase (PostgreSQL)
- 프레임워크: Next.js 14 (App Router)
- 개발 완료 후 반드시 git push까지 해줘
- 각 순위 완료 후 Vercel 배포 확인 후 다음 순위 진행

---

## 1순위: 앱 이름 변경 + PWA + 모바일 반응형

### 1-1. 앱 이름 변경
모든 파일에서 "주민자치 타임뱅크" → "TimePay" 로 변경:
- src/app/layout.tsx
- src/app/(auth)/login/page.tsx
- src/app/(auth)/register/page.tsx
- public/manifest.json
- package.json

### 1-2. PWA 적용

public/manifest.json 생성:
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

public/icons/ 폴더에 SVG 코드로 192x192, 512x512 PNG 아이콘 생성.
아이콘 디자인: 파란 원 배경에 흰색 시계 + 사람 실루엣.

public/sw.js 서비스워커 생성 (네트워크 우선 캐시 전략).
src/app/layout.tsx 에 서비스워커 등록 스크립트 추가.

모바일 접속 시 하단에 "홈화면에 추가하기" 안내 배너 표시.
배너는 한 번 닫으면 7일간 표시 안 함 (localStorage 사용).

### 1-3. 모바일 반응형 완성
- 모든 페이지 375px~430px 스마트폰 화면 최적화
- 터치 버튼 최소 크기 48px
- 하단 네비게이션 바 추가:
  아이콘 5개: 홈(🏠) / 서비스(🤝) / QR스캔(📷) / 커뮤니티(💬) / 내정보(👤)
- 스플래시 화면 추가 (앱 시작 시 TimePay 로고 1.5초 표시)

---

## 2순위: QR코드 시스템 + 별점 평가

### 2-1. 패키지 설치
```
npm install qrcode @zxing/library
```

### 2-2. DB 수정 (Supabase SQL 편집기에서 실행)
```sql
ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "qrCode" TEXT;
ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "avgRating" DECIMAL(3,2) DEFAULT 0;
ALTER TABLE "Member" ADD COLUMN IF NOT EXISTS "ratingCount" INT DEFAULT 0;

ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "providerRating" INT CHECK ("providerRating" BETWEEN 1 AND 5);
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "receiverRating" INT CHECK ("receiverRating" BETWEEN 1 AND 5);
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "providerReview" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "receiverReview" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "endedAt" TIMESTAMP;
```

### 2-3. 회원가입 시 QR코드 자동 생성
회원가입 완료 시 memberId를 QR코드로 인코딩하여 Member.qrCode 에 저장.

### 2-4. 내 QR코드 화면 (/wallet/qr)
- 내 QR코드 크게 표시
- 이름 + TC잔액 + 별점 표시
- "QR 저장하기" 버튼 (이미지 다운로드)
- "QR 공유하기" 버튼

### 2-5. QR 스캔 페이지 (/scan)
- 카메라 권한 요청
- 실시간 QR 스캔 (후면 카메라 사용)
- 스캔 성공 시 상대방 정보 표시 (이름, TC잔액, 별점)
- 두 가지 선택:
  A. "서비스 시작" → 카테고리 선택 → 시작 시간 기록
  B. "TC 직접 송금" → 수량 입력 → 즉시 이전

### 2-6. 서비스 시작/종료 QR 방식
서비스 시작:
  상대방 QR 스캔 → 서비스 카테고리 선택 → "시작" 버튼
  → Transaction 생성 (status: IN_PROGRESS, startedAt: 현재시간)

서비스 종료:
  상대방 QR 재스캔 → "종료" 버튼
  → endedAt 기록 → 시간 자동 계산 → TC 자동 계산
  → 양측 확인 후 완료 처리

### 2-7. 별점 평가
거래 완료 후 자동 팝업:
- ★ 1~5점 터치로 선택
- 한 줄 후기 입력 (선택)
- 제출 시 상대방 평균 별점 업데이트
- 프로필과 커뮤니티에 별점 표시

---

## 3순위: 커뮤니티 토론방 + 관리자 기능 강화

### 3-1. DB 추가 (Supabase SQL 편집기에서 실행)
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

### 3-2. 커뮤니티 페이지 (/community)
탭 구성: 전체 / 공지 / 자유 / 거래후기 / 질문
게시글 목록에 작성자 이름 + TC잔액 + 별점(★) 표시.
좋아요 버튼, 댓글 기능.
관리자는 공지 고정 가능.

### 3-3. API Routes
- GET/POST /api/community/posts
- GET /api/community/posts/[id]
- POST /api/community/posts/[id]/comments
- POST /api/community/posts/[id]/like

### 3-4. 관리자 타임페이 배분 (/admin/allocate)
- 회원 검색 (이름 또는 전화번호)
- 배분할 TC 수량 입력
- 배분 사유 입력
- 배분 시 관리자 계정 TC는 마이너스로 기록
- 관리자 대시보드에 "발행 총량 / 배분 완료 / 잔여" 표시

### 3-5. 엑셀 일괄 배분 (/admin/bulk-allocate)
```
npm install xlsx
```
- 엑셀 파일 업로드
- 엑셀 형식: 전화번호 | 이름 | TC수량 | 사유
- 미리보기 테이블 표시 후 "일괄 처리" 버튼
- 처리 결과 엑셀 다운로드
- 엑셀 템플릿 다운로드 버튼 제공

### 3-6. 관리자 거래 수정/삭제
- 관리자는 모든 거래 내역 조회/수정/삭제 가능
- 삭제 시 TC 자동 복구
- 수정/삭제 이력 로그 기록

### 3-7. 관리자 푸시 알림 (/admin/notifications)
브라우저 Notification API 사용 (외부 서비스 불필요):
- 알림 제목 + 내용 입력
- 발송 대상: 전체 / 동별 / 개인
- 접속 중인 사용자에게 브라우저 알림 발송
- 알림 내역 저장 및 조회

---

## 4순위: 만보기 + 위치 기반 + 전화 연결

### 4-1. 만보기 (스마트폰 내장 센서 사용 — 외부 앱 연동 없음)

별도 앱 설치나 연동 없이 스마트폰 자체 센서만 사용.

#### 작동 방식
```
스마트폰 내장 가속도계(Accelerometer) 센서
    ↓
브라우저 DeviceMotion API로 걸음수 감지
    ↓
오늘 걸음수 로컬 저장 (localStorage)
    ↓
10,000보 달성 시 0.5 TC 자동 적립
```

#### 구현 코드 방향
```typescript
// 걸음 감지 로직
window.addEventListener('devicemotion', (event) => {
  const acceleration = event.accelerationIncludingGravity
  // 가속도 변화로 걸음 감지
  // 임계값 초과 시 걸음 카운트 +1
})
```

#### 만보기 페이지 (/walk)
- 오늘 걸음수 크게 표시 (숫자 + 발자국 아이콘)
- 목표 달성률 원형 프로그레스 바
- 10,000보 달성 시 축하 애니메이션 + TC 적립 알림
- 이번 달 걷기 TC 적립 내역
- 주의문구 표시: "백그라운드 측정은 앱이 열려있을 때만 작동합니다"

#### 주의사항
- 백그라운드 측정 불가 (앱 화면이 열려있을 때만 측정)
- iOS는 DeviceMotion 권한 요청 필요 (버튼 클릭 시 권한 요청)
- 정확도는 전문 만보기보다 낮음을 사용자에게 안내

#### DB 추가
```sql
CREATE TABLE IF NOT EXISTS "WalkRecord" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
  "memberId" TEXT NOT NULL REFERENCES "Member"("id"),
  "date" DATE NOT NULL,
  "stepCount" INT DEFAULT 0,
  "tcEarned" DECIMAL(4,2) DEFAULT 0,
  "goalAchieved" BOOLEAN DEFAULT FALSE,
  UNIQUE("memberId", "date")
);
```

### 4-2. 위치 기반 서비스
브라우저 Geolocation API 사용 (외부 지도 API 없이 기본 구현):

서비스 등록 시:
- "현재 위치 사용" 버튼 → GPS 자동 입력
- 위도/경도 저장

서비스 목록에서:
- 내 위치 기준 거리 표시 (km)
- 가까운 순 정렬 옵션

```sql
ALTER TABLE "ServiceListing" ADD COLUMN IF NOT EXISTS "latitude" DECIMAL(10,7);
ALTER TABLE "ServiceListing" ADD COLUMN IF NOT EXISTS "longitude" DECIMAL(10,7);
ALTER TABLE "ServiceListing" ADD COLUMN IF NOT EXISTS "locationName" TEXT;
```

### 4-3. 전화 연결
서비스 상세 페이지에서:
- 매칭 성사 후에만 "전화하기" 버튼 표시
- 버튼 클릭 시 tel: 링크로 즉시 연결
- 매칭 전에는 버튼 비활성화

---

## 전체 개발 순서 요약

```
1단계: 앱 이름 TimePay 변경 → PWA 적용 → 모바일 반응형
       완료 후 git push → Vercel 배포 확인

2단계: QR코드 생성/스캔 → 서비스 시작/종료 QR → 별점 평가
       완료 후 git push → Vercel 배포 확인

3단계: 커뮤니티 토론방 → 관리자 엑셀 배분 → 관리자 알림
       완료 후 git push → Vercel 배포 확인

4단계: 만보기(내장센서) → 위치 기반 → 전화 연결
       완료 후 git push → Vercel 배포 확인
```

---

## 공통 개발 원칙
- 모든 UI는 모바일 375px 기준으로 먼저 설계
- 한국어 UI 유지
- 외부 유료 API 사용 금지
- 기존 DB는 ALTER TABLE로 컬럼 추가 (테이블 삭제 금지)
- 각 기능 완성 후 반드시 git push
- 배포 실패 시 즉시 오류 수정 후 재push
- 어르신 사용 고려: 버튼 크게, 글자 크게, 단순하게
