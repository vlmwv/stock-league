# 주식 예측 리그 (Stock Prediction League)

## 1. 프로젝트 설명
매일 5개의 종목을 선정하여 유저들이 주가의 상승 및 하락을 예측하는 게임 서비스입니다.
- **매일 09:00~16:00 (1시간 주기)**: 장중 뉴스 및 전자공시 실시간 수집 및 AI 요약 (`fetch-market-news-periodically`)
- **매일 20:20**: 당일 종가 확인 및 유저 예측 채점 (`process-daily-results`)
- **매일 20:25**: 주간/월간 랭킹 집계 및 업데이트 (`calculate-rankings`)
- **매일 20:40**: KRX 상위 100종목 시가총액 순위 업데이트 (`update-krx-top-100`)
- **매일 21:20**: 내일의 도전 종목 5개 선정 및 LLM 추천 사유 생성 (`select-daily-stocks`)
- **매일 21:30**: 도전 종목 상세 뉴스/공시 요약 생성 (`fetch-news-summary`)
- **매월/매년 초**: 명예의 전당 데이터 이관 (`transfer-hall-of-fame`)

## 2. 기술 스택
- **Frontend**: Nuxt.js (Vue 3), TypeScript, NuxtUI, Tailwind CSS
- **Backend/Database**: Supabase (PostgreSQL, Edge Functions, Auth)
- **Deployment**: Vercel 연동, Docker Compose (로컬 환경)
- **기타**: VueUse, Pinia, PWA 지원

## 3. 주요 기능
- **회원 관리**: 이메일 가입 및 OAuth2 소셜 로그인 지원, JWT 토큰 인가
- **게임 참여**: 위/아래 플릭(Flick) 제스처를 통한 직관적인 상승/하락 예측
- **종목 추천 및 요약**: LLM을 활용한 종목 뉴스 및 공시 요약 정보 제공
- **찜하기**: 롱클릭을 통하여 관심 종목 찜하기 기능 지원
- **랭킹 시스템**: 주간/월간/연간/역대 랭킹 집계 (기본 랭킹은 월간 승률 기준)
- **결과 연출**: 유저 예측 결과 및 랭킹 상승을 보여주는 드라마틱한 팝업 애니메이션 효과

## 4. 로컬 실행 방법

종속성 설치:
```bash
npm install
```

개발 서버 실행 (http://localhost:3000):
```bash
npm run dev
```

## 5. 인증 설정 (Supabase Auth)

이 프로젝트는 Supabase Auth를 사용하여 회원가입 및 소셜 로그인을 관리합니다.

### 5.1 환경 변수 설정
`.env` 파일에 다음 정보가 포함되어 있어야 합니다:
```env
SUPABASE_URL=https://zmqjooidmibqrigziipq.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptcWpvb2lkbWlicXJpZ3ppaXBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MzAzMDcsImV4cCI6MjA4OTUwNjMwN30.caByRDqXSCjY4txk_mRxBlT4cKG2O2jNuugbTo3RUfo
```

### 5.2 OAuth2.0 설정 (Google, Kakao)
1. **Supabase Dashboard** > **Authentication** > **Providers**로 이동합니다.
   - [대시보드 바로가기](https://supabase.com/dashboard/project/zmqjooidmibqrigziipq/auth/providers)
2. 각 제공자(Google, Kakao)의 아코디언 메뉴를 펼치고 **'Enable'** 스위치를 켭니다.
3. 해당 개발자 센터에서 발급받은 **Client ID**와 **Client Secret**을 입력한 후 **'Save'**를 클릭합니다.
   - **참고**: 이 값들은 소스 코드(`.env` 등)에 넣지 않고 Supabase 대시보드 내에 직접 설정합니다.
3. **Redirect URL** 설정:
   - 각 개발자 센터의 Redirect URI 설정에 다음 주소를 추가합니다:
     - `https://zmqjooidmibqrigziipq.supabase.co/auth/v1/callback`
   - 서비스 내 콜백 페이지: `http://localhost:3000/auth/confirm` (로컬 기준)

## 6. 관련 문서
- [기획 및 요구사항](plan_request.md)
- [아키텍처 추천](architecture_recommend.md)
- [포팅 및 구현 계획](plan_implementation.md)
- [ERD (Entity Relationship Diagram)](erd.md)
- [작업 목록(Task)](task.md)
