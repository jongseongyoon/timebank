# 타임뱅크 개발 환경 설정 가이드

## 사전 요구사항

- Node.js 20+ (https://nodejs.org/en/download)
- Docker Desktop (https://www.docker.com/products/docker-desktop)
- Git

## 최초 설정 순서

### 1. Node.js 설치 확인
```bash
node --version   # v20.x.x 이상
npm --version
```

### 2. 의존성 설치
```bash
cd C:\Users\chan0\timebank
npm install
```

### 3. Docker로 DB 실행
```bash
docker compose up -d
```

### 4. 환경변수 설정
```bash
# .env 파일은 이미 개발용으로 설정되어 있습니다
# 필요 시 .env.example을 참고하여 수정
```

### 5. Prisma 마이그레이션
```bash
npm run db:migrate
# 마이그레이션 이름: init
```

### 6. 시드 데이터 삽입
```bash
npm run db:seed
```

### 7. 개발 서버 실행
```bash
npm run dev
# http://localhost:3000 접속
```

### 8. 단위 테스트 실행
```bash
npm test
```

## 테스트 계정

| 역할 | 이메일 | 비밀번호 |
|------|--------|---------|
| 관리자 | admin@timebank.kr | password123! |
| 코디네이터 | coord1@timebank.kr | password123! |
| 제공자 | provider1@timebank.kr | password123! |
| 수요자(취약계층) | receiver1@timebank.kr | password123! |

## DB 관리 UI
```bash
npm run db:studio
# http://localhost:5555
```
