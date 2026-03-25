# 서비스 배포 가이드 (Deployment Guide)

본 문서는 **주식 예측 리그** 프로젝트의 운영 서버(Railway + Supabase) 배포 및 최종 설정 방법을 정리합니다.

---

## 1. Supabase 설정 (Backend & Auth)

### 1.1 환경 변수 및 접속 정보
| 변수명 | 실제 값 (예시) | 비고 |
| :--- | :--- | :--- |
| `SUPABASE_URL` | `https://zmqjooidmibqrigziipq.supabase.co` | 프로젝트 접속 URL |
| `SUPABASE_KEY` | `eyJhbG...` | 익명 키 (Anon Key) |

### 1.2 소셜 로그인 (Kakao) 주의사항
- **KOE205 에러 발생 시**: 카카오 개발자 센터의 **[동의항목]**에서 `닉네임`과 `프로필 사진`을 **선택 동의** 이상으로 설정해야 합니다.
- **이메일(account_email) 관련**: 현재 비즈니스 인증 없이 로그인할 수 있도록 보정되어 있습니다. 만약 이메일 정보를 받고 싶다면 카카오 비즈니스 인증 후 코드를 수정해야 합니다.
- **Redirect URI 등록**: `https://<YOUR_DOMAIN>/auth/confirm` 및 Supabase 콜백 주소를 카카오/구글 센터에 반드시 등록하세요.

---

## 2. Railway 배포 설정 (Nuxt 4 / SSR)

### 2.1 커스텀 빌드 (Dockerfile)
Nuxt 4와 `oxc-parser` 등 네이티브 바인딩 이슈를 해결하기 위해 **Dockerfile**을 통한 빌드를 권장합니다.
- **Builder**: Railway Settings에서 `DOCKERFILE`을 선택하세요.
- **PORT**: `8080` 포트로 통신하도록 설정되어 있습니다.

### 2.2 런타임 환경 변수 (Railway Variables)
반드시 다음 변수들을 Railway 대시보드에 직접 입력해야 합니다.
- `SUPABASE_URL`: Supabase 프로젝트 URL
- `SUPABASE_KEY`: Supabase 익명 키
- `PORT`: `8080` (자동 감지되지만 명시 권장)

> [!IMPORTANT]
> Nuxt 4 환경에서는 환경 변수가 `process.env`를 통해 런타임에 주입되어야 합니다. 현재 `nuxt.config.ts`에서 `runtimeConfig`와 최상단 매핑을 통해 안정성을 확보했습니다.

---

## 3. 데이터베이스 및 서버 유지보수

### 3.1 초기 스키마 반영 (SQL Editor)
테이블이 비어있어 발생하는 500 에러를 방지하기 위해 다음 순서로 SQL을 실행하세요:
1. `supabase/migrations/20260320000000_initial_schema.sql` (기본 테이블)
2. `supabase/migrations/20260320000001_extended_schema.sql` (확장 기능)
3. `supabase/seed.sql` (초기 종목 데이터)

### 3.2 에러 모니터링
- **Nitro 로그**: 서버 에러 발생 시 Railway **Deploy Logs**에 상세 스택 트레이스가 출력되도록 `server/plugins/error.ts`가 구성되어 있습니다.
- **AuthMiddleware**: `/api/` 경로 요청 시 인증되지 않은 사용자는 `401` 에러가 발생하며, 아이콘 등 공용 리소스는 화이트리스트 처리되어 있습니다.

---

## 5. 에지 함수(Edge Functions) 및 배치 작업

뉴스 수집, 랭킹 집계 등 백엔드 배치는 Supabase Edge Functions로 동작합니다.

### 5.1 에지 함수 배포
로컬 PC에서 Supabase CLI를 사용하여 배포합니다:
```bash
# 전체 함수 배포
supabase functions deploy

# 특정 함수만 배포
supabase functions deploy fetch-market-news-periodically
```

### 5.2 환경 변수(Secrets) 설정
에지 함수 트리거 및 LLM 연동을 위해 다음 비밀키들을 설정해야 합니다:
```bash
supabase secrets set GEMINI_API_KEY=your_gemini_api_key
supabase secrets set SUPABASE_URL=your_project_url
supabase secrets set SERVICE_ROLE_KEY=your_service_role_key
```

### 5.3 크론(Cron) 작업 등록
`supabase/migrations/20260324000000_setup_cron_jobs.sql` 파일을 Supabase SQL Editor에서 실행하세요.
- **주의**: 실행 전 파일 내의 `YOUR_PROJECT_REF`와 `YOUR_SERVICE_ROLE_KEY_HERE` 부분을 실제 값으로 수정해야 합니다.
- **상세 검증 방법**: 배치 작업의 정상 동작 여부 확인 및 수동 테스트 방법은 [배치 기능 검증 가이드](file:///Users/min-woolee/IdeaProjects/mine/stock/BATCH_VERIFICATION.md)를 참고하세요.
