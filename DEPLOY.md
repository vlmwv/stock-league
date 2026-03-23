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

### 2.3 도메인 설정 (Domain Expansion)
- **Settings > Networking**에서 **Generate Domain**을 선택하여 외부 접속 URL을 생성합니다.
- 생성된 도메인(예: `xxx.up.railway.app`)을 **Supabase Dashboard > Authentication > URL Configuration > Redirect URLs**에 추가해야 정상적인 로그인이 가능합니다.

---

## 3. 주기적 배치 작업 (Cron Jobs)

현재 이 프로젝트는 **Supabase Edge Functions**를 통해 데이터 수집(뉴스, 시세 등)을 수행하도록 설계되어 있습니다.

- **장중 뉴스 수집**: 매 시간 실행 (`fetch-market-news-periodically`)
- **결과 처리 및 랭킹**: 매일 20:20~20:40 실행
- **내일의 종목 선정**: 매일 21:20 실행

이 작업들은 `supabase/functions/` 하위 소스들을 배포하고 Supabase 에지 함수 메뉴에서 스케줄러를 등록하여 활성화할 수 있습니다.
