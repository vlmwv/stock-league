# 서비스 배포 가이드 (Deployment Guide)

본 문서는 주식 예측 리그 프로젝트의 핵심 서비스인 **Supabase**와 **Railway**의 배포 및 설정 방법을 정리합니다.

---

## 1. Supabase 설정 (Backend & Auth)

### 1.1 환경 변수 및 접속 정보
대부분의 애플리케이션 설정은 `.env` 파일과 Supabase 대시보드에 연동됩니다.

| 변수명 | 실제 값 | 비고 |
| :--- | :--- | :--- |
| `SUPABASE_URL` | `https://zmqjooidmibqrigziipq.supabase.co` | 프로젝트 접속 URL |
| `SUPABASE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptcWpvb2lkbWlicXJpZ3ppaXBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MzAzMDcsImV4cCI6MjA4OTUwNjMwN30.caByRDqXSCjY4txk_mRxBlT4cKG2O2jNuugbTo3RUfo` | 익명 키 (Anon Key) |
| `SUPABASE_SERVICE_ROLE_KEY` | `(Supabase 대시보드에서 확인)` | 관리자용 서비스 역할 키 (Admin Only) |

> [!CAUTION]
> `SUPABASE_SERVICE_ROLE_KEY`는 모든 RLS(Row Level Security)를 우회하는 강력한 키입니다. 절대로 클라이언트 사이드 코드(`.vue` 파일 등)에서 사용하지 마세요. 오직 서버 사이드 배치 작업이나 관리용 API에서만 사용해야 합니다.

### 1.2 소셜 로그인 (OAuth 2.0) 설정
- **위치**: [Supabase Dashboard > Authentication > Providers](https://supabase.com/dashboard/project/zmqjooidmibqrigziipq/auth/providers)
- **지원 제공자**: Google, Kakao (Naver는 지원하지 않음)
- **Redirect URI**: 
  - `https://zmqjooidmibqrigziipq.supabase.co/auth/v1/callback` 를 각 개발자 센터에 등록.

---

## 2. Railway 배포 (Nuxt.js Web Hosting)

### 2.1 프로젝트 연결 및 배포
1. [Railway Dashboard](https://railway.app/new)에서 저장소(GitHub Repo)를 연결합니다.
2. 루트 디렉토리에 있는 `railway.json` 설정에 따라 자동으로 빌드 및 배포가 시작됩니다.

### 2.2 환경 변수 (Variables) 추가
Railway 서비스의 **Variables** 탭에서 다음 항목을 추가합니다.
- `SUPABASE_URL`: 상단 1.1의 URL 입력
- `SUPABASE_KEY`: 상단 1.1의 KEY 입력
- `NODE_ENV`: `production`

### 2.3 도메인 설정 (Domain & Custom Domain)
- **기본 도메인**: **Settings > Networking**에서 **Generate Domain**을 선택하여 `xxx.up.railway.app` 형태의 도메인을 생성할 수 있습니다.
- **커스텀 도메인**: 
  1. **Settings > Networking**에서 **Custom Domain**을 클릭합니다.
  2. 구매하신 도메인(예: `stockleague.com`)을 입력합니다.
  3. Railway에서 제공하는 DNS 설정(CNAME 레코드 등)을 도메인 구매처(가비아, 후이즈 등)의 DNS 설정에 등록합니다.
- **중요**: 생성된 도메인 주소를 **Supabase Dashboard > Authentication > URL Configuration > Redirect URLs**에 추가해야 정상적인 로그인이 가능합니다.

### 2.4 데이터베이스 초기화 (Supabase SQL)
- 배포 후 발생하는 500 에러는 테이블이 없기 때문입니다. **Supabase SQL Editor**에서 다음 파일들을 순서대로 실행하세요.
  1. [`initial_schema.sql`](./supabase/migrations/20260320000000_initial_schema.sql)
  2. [`extended_schema.sql`](./supabase/migrations/20260320000001_extended_schema.sql)
  3. [`seed.sql`](./supabase/seed.sql)

---

## 3. Supabase CLI를 통한 배포 (Database & Functions)

로컬에 작성된 마이그레이션과 에지 함수를 운영 환경에 반영하기 위해 **Supabase CLI**를 사용합니다.

### 3.1 로그인 및 프로젝트 연결
```bash
# 1. 로그인
npx supabase login

# 2. 프로젝트 연결 (최초 1회)
npx supabase link --project-ref zmqjooidmibqrigziipq
```

### 3.2 데이터베이스 마이그레이션 (DB Push)
`supabase/migrations/` 폴더 내의 파일들을 운영 DB에 반영합니다.
```bash
npx supabase db push
```

### 3.3 에지 함수 배포 (Edge Functions)
`supabase/functions/` 하위 소스들을 배포합니다.
```bash
npx supabase functions deploy
```
*개별 배포 예시: `npx supabase functions deploy select-daily-stocks`*

---

## 4. 주기적 배치 작업 (Cron Jobs) 확인

배포가 완료되면 다음 작업들이 Supabase 내부에서 자동으로 실행됩니다.

- **장중 뉴스 수집**: 매 시간 실행 (`fetch-market-news-periodically`)
- **결과 처리 및 랭킹**: 매일 20:20~20:40 실행
- **내일의 종목 선정**: 매일 21:20 실행
