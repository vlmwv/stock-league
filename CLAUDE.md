# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 개요

**니나노AI (ninanoai.com)** — 한국형 주식 예측 게임("주식 예측 리그"). 매일 KRX 종목 5개를 선정하면 유저가 상승/하락을 예측하고, 실제 종가와 비교해 채점한 뒤 주간/월간/연간/역대 랭킹으로 경쟁한다. AI 추천 종목(목표가 포함), 뉴스/공시 요약, 관심 종목(찜) 기능, 과거 시장 "시나리오" 미니게임도 포함한다.

Nuxt 4(Vue 3) SSR 프론트엔드 + Nitro 서버 API로 구성되며, 백엔드는 전적으로 Supabase(Postgres, Auth, Edge Functions)에 의존한다. 매일 자동화되는 작업(종목 선정·채점·랭킹 집계·뉴스 수집)은 **Nuxt 서버가 아니라** pg_cron으로 스케줄된 Supabase Edge Function에서 실행된다.

## 명령어

```bash
npm install            # legacy-peer-deps 사용(.npmrc에 설정) — Nuxt 4 + oxc-parser 때문에 필수
npm run dev            # http://localhost:3000 개발 서버
npm run build          # nuxt build → .output/ (Node 서버 엔트리)
npm run preview        # 프로덕션 빌드 미리보기
```

**테스트 스위트·린터·타입체크 스크립트는 없다.** `npm run postinstall`은 `nuxt prepare`로 `.nuxt/` 타입을 재생성한다.

### 일회성 유지보수 스크립트 (`scripts/`)
Node TS 로더로 실행하며 `dotenv`로 `.env`를 로드한다. `NUXT_PUBLIC_SUPABASE_URL` + `NUXT_SUPABASE_SERVICE_ROLE_KEY`로 Supabase에 직접 접속한다:
```bash
npx tsx scripts/debug_db.ts          # 예: backfill_history.ts, check_ranking_bug.ts, recalculate_ai_scores.ts
```

### Edge Function 및 배치 테스트
```bash
supabase functions deploy                      # 전체 배포
supabase functions deploy select-daily-stocks  # 단일 배포
./scripts/test-batch.sh calculate-rankings     # 배포된 함수를 curl로 수동 트리거
```

## 아키텍처

### 데이터 흐름과 계층
- **클라이언트 읽기는 RLS의 통제 아래 `useSupabaseClient()`(브라우저)로 Supabase에 직접 접근한다.** 데이터 조회 로직 대부분은 **`app/composables/useStock.ts`** 에 모여 있다(중심 컴포저블 — 오늘의 종목, 추천, 예측, 찜/그룹, 랭킹, 유저 통계, 뉴스, 테마). 시나리오 게임은 `useScenario.ts`가 담당한다.
- **`server/api/**`(Nitro)** 는 service role / RPC / RLS로는 막히는 교차 유저 집계가 필요한 쿼리에 사용한다(예: `get_participant_count`). API 라우트는 `#supabase/server`의 `serverSupabaseClient`/`serverSupabaseUser`를 쓴다.
- **상태**는 (라이브 데이터에 대해 Pinia가 아니라) Nuxt `useState` 키로 공유된다. `app/stores/stock.ts`는 **하드코딩된 목 데이터**를 가진 잔재 Pinia 스토어로, 진짜 소스가 아니다. 실데이터는 `useStock`에서 온다.
- 공유 헬퍼는 `app/utils/stock.ts`에 있다: `isEtf`(ETF 제외 필터), `decodeHtmlEntities`/`cleanLlmSummary`(요약·뉴스 텍스트 정제), `getNewsUrl`/`repairNewsUrl`(네이버 금융 URL 보정). Edge Function은 앱 코드를 import할 수 없으므로 `isEtf` 등은 Deno 함수 안에 **복제되어 있다** — 한쪽을 고치면 다른 쪽도 함께 확인할 것.

### 인증 (2개 계층, 둘 다 중요)
- **`app/middleware/auth.ts`** — 클라이언트 라우트 가드: `useSupabaseUser()`가 없으면 `/login`으로 리다이렉트. `app/middleware/admin.ts`는 추가로 `profiles.role === 'admin'`을 확인한다.
- **`server/middleware/auth.ts`** — 모든 `/api/**` 요청을 가드한다. 공개 라우트는 화이트리스트 처리(`/api/rankings`, `/api/stocks`, `/api/scenarios/rankings`, `/api/hall-of-fame`, `/api/_nuxt_icon`). `Authorization: Bearer` 헤더 토큰과 쿠키 세션을 **둘 다** 지원한다(`auth.getUser` 하이브리드 검증). RBAC 역할은 `user.app_metadata.role`에서 가져오며, `/api/admin/**`은 `admin`이 필요하다. `@nuxtjs/supabase`의 전역 리다이렉트는 **비활성화**(`redirect: false`)되어 있어 메인 페이지가 공개된다.
- 예외: `server/routes/api/stocks/prepare-daily.ts`는 표준 세션 미들웨어가 아니라 요청의 Bearer 토큰을 **service role 키와 직접 비교**해 인가한다(내부/배치 트리거용). 새 배치성 라우트도 이 패턴을 따른다.
- OAuth(Google, Kakao)는 코드가 아니라 **Supabase 대시보드**에서 설정한다. 콜백 페이지는 `/auth/confirm`. 로그인 시 (캐시된 `useSupabaseUser()` 대신) `auth.getUser()`를 쓰는 하이브리드 패턴이 곳곳에 있는데, Nuxt 리액티브 캐싱 타이밍 버그를 피하기 위한 것이다 — 최근 커밋 이력 참고. 로그인 무한 리다이렉트 루프의 반복적 원인이었다.

### 시간 기반 게임 로직 (핵심, KST 중심)
모든 리그 타이밍은 서버 TZ와 무관하게 `Intl.DateTimeFormat`으로 계산한 **KST(Asia/Seoul)** 기준이다. `useStock.ts`의 주요 구간:
- **21:20 KST** — 다음 날 종목 선정. 이후 앱은 *내일* 리그를 보여주고 자동 새로고침한다(30초 `kstTime` 인터벌이 `refresh()` 트리거).
- **리그 오픈 구간**: 21:20 → 다음 날 08:00(예측 접수). `isLeagueOpen`.
- **20:30 KST** — 결과 발표. `isResultPublished`.
예측/결과/이력 필터링을 수정할 때는 이 경계를 유지할 것 — 과거/대기중/오늘 로직이 서로 얽혀 있다.

### 배치 자동화 (Supabase Edge Function + pg_cron)
`supabase/functions/`의 함수들은 매일 스케줄로 실행된다(`supabase/migrations/*_setup_cron_jobs.sql`로 등록). **service role 키**와 Gemini API를 직접 사용한다(Deno 런타임, 의존성은 `import_map.json`의 esm.sh). 스케줄(KST):
- 매시 09–16시 `fetch-market-news-periodically` — 뉴스/공시 스크래핑 + AI 요약
- 20:20 `process-daily-results` — 종가 확인, 예측 채점
- 20:25 `calculate-rankings` — 주간/월간/연간 집계
- 20:40 `update-krx-top-100` — 시가총액 순위
- 21:20 `select-daily-stocks` — 종목 5개 선정 + LLM 사유/목표가
- 21:30 `fetch-news-summary` — 당일 선정 종목 상세 요약
- 매월/매년 `transfer-hall-of-fame`

### 데이터베이스
스키마는 `supabase/migrations/`의 순서가 있는 SQL 마이그레이션으로 관리된다(파일명은 타임스탬프). 핵심 테이블: `profiles`, `stocks`, `daily_stocks`, `predictions`, `rankings`, `news`, `wishlists`/`wishlist_groups`, `stock_price_history`, `scenario_attempts`, `economic_indicators`. 전체 ERD는 `erd.md`. RLS에 크게 의존하므로 교차 유저 카운트는 RPC(`get_participant_count`)를 쓴다. 생성된 타입: `supabase/types.ts`.

### 알아둘 복원력 패턴
`useStock.ts`의 쿼리는 Postgres 에러 `42703`(정의되지 않은 컬럼)이 나면 더 최신 컬럼을 빼고 쿼리를 다시 던지며, 대상 날짜에 데이터가 없으면 가장 최근의 `game_date`로 폴백한다. 앱과 라이브 DB 사이의 스키마/배포 드리프트를 방어하기 위함이다. 새 옵셔널 컬럼은 존재한다고 가정하지 말고 이 폴백 안에 넣을 것.

## 컨벤션
- 코드 주석과 사용자 노출 문자열은 **한글**이다. 같은 스타일을 유지할 것.
- 뮤테이션(예측, 찜 토글)은 에러 시 롤백하는 낙관적 UI 업데이트가 표준이다 — `useStock.ts`의 기존 패턴을 따를 것.
- 런타임 설정 키는 `nuxt.config.ts`의 `runtimeConfig`에서 `NUXT_*` 환경변수로부터 매핑된다(예: `NUXT_PUBLIC_SUPABASE_URL`, `NUXT_SUPABASE_SERVICE_ROLE_KEY`, `NUXT_GEMINI_API_KEY`). Nuxt 4는 이 값들을 `process.env`로 런타임에 주입해야 한다.
- 기본 컬러 모드는 **다크** 고정. UI는 `@nuxt/ui` v4 + Tailwind, 차트는 `vue3-apexcharts`. PWA 활성화됨.

## 배포
**Dockerfile**(Node 20 slim, `npm install --legacy-peer-deps`)로 빌드한다 — Nuxt 4 / oxc-parser 네이티브 바인딩 이슈 회피를 위해 필수. Railway에 배포(`railway.json`, Dockerfile 빌더). Supabase secrets, cron 등록, Kakao OAuth(KOE205) 관련은 `DEPLOY.md` 참고.

## 작업 규칙 (전역 ~/.claude/CLAUDE.md 준수)
- 모든 답변은 한글로 한다.
- 개발 시 기존 소스를 참조해 비슷한 형태를 유지한다.
- 변경이 없는 소스에 공백/줄 추가로 불필요한 diff를 만들지 않는다.
