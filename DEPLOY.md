# 서비스 배포 가이드 (Deployment Guide)

본 문서는 **주식 예측 리그** 프로젝트의 운영 서버(Vercel + Supabase) 배포 및 최종 설정 방법을 정리합니다.

---

## 1. Supabase 설정 (Backend & Auth)

### 1.1 환경 변수 및 접속 정보
| 변수명 | 실제 값 (예시) | 비고 |
| :--- | :--- | :--- |
| `SUPABASE_URL` | `` | 프로젝트 접속 URL |
| `SUPABASE_KEY` | `` | 익명 키 (Anon Key) |

### 1.2 소셜 로그인 (Kakao) 주의사항
- **KOE205 에러 발생 시**: 카카오 개발자 센터의 **[동의항목]**에서 `닉네임`과 `프로필 사진`을 **선택 동의** 이상으로 설정해야 합니다.
- **이메일(account_email) 관련**: 현재 비즈니스 인증 없이 로그인할 수 있도록 보정되어 있습니다. 만약 이메일 정보를 받고 싶다면 카카오 비즈니스 인증 후 코드를 수정해야 합니다.
- **Redirect URI 등록**: `https://<YOUR_DOMAIN>/auth/confirm` 및 Supabase 콜백 주소를 카카오/구글 센터에 반드시 등록하세요.

---

## 2. Vercel 배포 설정 (Nuxt 4 / SSR)

### 2.1 프로젝트 연동
- Vercel 대시보드에서 GitHub 저장소를 Import 합니다. Framework Preset은 **Nuxt**로 자동 감지되며, Build Command(`nuxt build`)·Output 설정은 기본값을 그대로 둡니다.
- Nitro가 `VERCEL` 환경을 감지해 Vercel preset으로 빌드하므로 별도 `vercel.json`은 필요 없습니다.
- `.npmrc`의 `legacy-peer-deps=true`를 Vercel 빌드도 그대로 읽습니다(Nuxt 4 + oxc-parser 의존성 충돌 회피).
- 서버리스 함수 리전은 `nuxt.config.ts`의 `nitro.vercel.functions.regions`에서 **서울(icn1)** 로 고정되어 있습니다. Supabase와 같은 리전이어야 API 응답 지연이 최소화됩니다.

### 2.2 런타임 환경 변수 (Vercel Environment Variables)
Project Settings → Environment Variables에 다음 변수를 **Production** 환경에 등록합니다.
- `NUXT_PUBLIC_SUPABASE_URL`: Supabase 프로젝트 URL
- `NUXT_PUBLIC_SUPABASE_KEY`: Supabase 익명 키(Anon Key)
- `NUXT_PUBLIC_SITE_URL`: `https://ninanoai.com`
- `NUXT_SUPABASE_SERVICE_ROLE_KEY`: Supabase service role 키(서버 전용)
- `NUXT_GEMINI_API_KEY`: Gemini API 키(서버 전용)

> [!IMPORTANT]
> Nuxt 4 환경에서는 환경 변수가 `process.env`를 통해 런타임에 주입되어야 합니다. `nuxt.config.ts`의 `runtimeConfig`가 `NUXT_*` 변수를 매핑하므로 반드시 `NUXT_` 프리픽스를 붙여 등록하세요.

### 2.3 커스텀 도메인
- Vercel 프로젝트 Settings → Domains에 `ninanoai.com`(및 `www`)을 추가하고, 안내되는 A/CNAME 레코드를 도메인 등록기관 DNS에 반영합니다. SSL은 자동 발급·갱신됩니다.
- 도메인이 유지되므로 Supabase Auth의 Site URL / Redirect URL, 카카오·네이버 콜백 주소는 변경할 필요가 없습니다. 다만 전환 직후 로그인 플로우를 한 번 확인하세요.

### 2.4 알아둘 차이점
- 서버리스 특성상 `server/api/stocks/indices.get.ts`의 메모리 캐시는 인스턴스마다 따로 잡혀 히트율이 낮습니다. 외부 API 실패 시 폴백 데이터가 있어 기능 문제는 없습니다.
- Hobby 플랜은 비상업적 용도에 한정됩니다.

---

## 3. 데이터베이스 및 서버 유지보수

### 3.1 초기 스키마 반영 (SQL Editor)
테이블이 비어있어 발생하는 500 에러를 방지하기 위해 다음 순서로 SQL을 실행하세요:
1. `supabase/migrations/20260320000000_initial_schema.sql` (기본 테이블)
2. `supabase/migrations/20260320000001_extended_schema.sql` (확장 기능)
3. `supabase/seed.sql` (초기 종목 데이터)

### 3.2 에러 모니터링
- **Nitro 로그**: 서버 에러 발생 시 Vercel **Runtime Logs**에 상세 스택 트레이스가 출력되도록 `server/plugins/error.ts`가 구성되어 있습니다.
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
supabase secrets set GEMINI_API_KEY=
supabase secrets set SUPABASE_URL=
supabase secrets set SERVICE_ROLE_KEY=
```

### 5.3 크론(Cron) 작업 등록
`supabase/migrations/20260324000000_setup_cron_jobs.sql` 파일을 Supabase SQL Editor에서 실행하세요.
- **주의**: 실행 전 파일 내의 `YOUR_PROJECT_REF`와 `YOUR_SERVICE_ROLE_KEY_HERE` 부분을 실제 값으로 수정해야 합니다.
- **상세 검증 방법**: 배치 작업의 정상 동작 여부 확인 및 수동 테스트 방법은 [배치 기능 검증 가이드](docs/batch-verification.md)를 참고하세요.
