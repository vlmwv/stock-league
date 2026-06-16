# 니나노AI 코드베이스 구조 분석

> 작성일: 2026-06-15 · 갱신: 2026-06-17(useStock 분리 완료·#1 폴백 제거·품질도구 그린 반영) · 대상: `ninanoai.com` (주식 예측 리그)

## 1. 전체 개요

**한국형 주식 예측 게임** (ninanoai.com). Nuxt 4(Vue 3) SSR + Nitro 서버로 구성되며, 백엔드는 전적으로 Supabase(Postgres, Auth, Edge Functions)에 의존한다. 코드 규모는 약 **16,000줄** (TS 46개 + Vue 34개 파일).

```
┌─────────────── 프론트엔드 (Nuxt 4 / Vue 3) ───────────────┐
│  pages/ (18개)  ─  components/ (20개)  ─  middleware (2)   │
│                         ↓                                   │
│  composables/ useStock(파사드 96줄) + 도메인 11개 · useScenario │
│  utils/{stock, stockHistory}.ts (순수함수)                      │
└────────────┬──────────────────────────┬────────────────────┘
             │ 직접 쿼리(RLS)            │ 교차유저 집계만
             ↓                          ↓
   ┌──────────────────┐      ┌─────────────────────────┐
   │  Supabase Client │      │ server/api/** (Nitro 15) │
   │  (브라우저)       │      │ + server/middleware/auth │
   └────────┬─────────┘      └───────────┬─────────────┘
            │                            │
            ↓        Supabase (Postgres + Auth + RLS)        ↓
   ┌──────────────────────────────────────────────────────────┐
   │  64개 마이그레이션 · RPC · 13개 Edge Function (pg_cron 배치)│
   └──────────────────────────────────────────────────────────┘
```

## 2. 계층별 진단

### 2.1 프론트엔드 데이터 계층
- **`useStock.ts`는 도메인 컴포저블을 합쳐 내보내는 96줄 파사드**다(착수 시 2089줄 단일 거대 컴포저블 → 11개 도메인 컴포저블로 분리 완료, `docs/refactor-usestock-plan.md`). 파사드는 도메인을 가로지르는 오케스트레이션(`refreshAll`·`watch(user)`·`allPredicted`)과 반환 표면 조합만 담당하고, 소비자 18곳은 여전히 `useStock()`만 호출한다(반환 키 불변).

  | 컴포저블 | 담당 |
  |---------|------|
  | `useKstTime` / `useStockClient` | KST 시간 유틸·`kstTime` / Supabase 클라이언트·세션 검증(`resolveUser`) |
  | `useDailyStocks` | 오늘의 종목·추천·시총·타겟가 asyncData, 리그/결과 상태, 30초 자동 새로고침 |
  | `usePredictions` | 예측 제출/조회, 참여자·회원 수 (`useDailyStocks` 주입) |
  | `useWishlist` | 찜·폴더 CRUD, 낙관적 업데이트+롤백 |
  | `useUserProfile` | 프로필·랭크·승률·스트릭(KST), 예측 이력 |
  | `useRankings` · `useStockDirectory` · `useAiHistory` · `useNews` · `useRecommendationAdmin` | 역대 랭킹 / 종목 검색·상세·시세 / AI 추천 이력 / 뉴스·테마·알림 / 추천 관리 |

- 데이터 소스는 **대부분 `useSupabaseClient()` 직접 쿼리(RLS)**, API 호출은 단 2곳(`/api/stocks/themes`, `/api/scenarios/rankings`)뿐.
- 추천 기준가(rec_price) 계산은 `utils/stockHistory.ts`로 추출해 3곳 중복을 제거했고, 스키마 드리프트 42703 폴백은 컬럼 존재 확인 후 제거 완료.
- `useScenario.ts`(632줄)는 10개 시나리오를 **하드코딩**(약 1440개 캔들 데이터)으로 메모리에 로드 — 잔여 백로그(DB 이관 예정).
- `app/stores/stock.ts`(죽은 Pinia 스토어)는 **삭제됨**.
- `app/utils/stock.ts` 순수 함수: `isEtf`, `decodeHtmlEntities`, `cleanLlmSummary`, `getNewsUrl`, `repairNewsUrl`.

### 2.2 서버 API 계층 (Nitro, 15개)
- service role / RPC가 필요한 **교차 유저 집계용**으로만 얇게 존재.
- `server/middleware/auth.ts`가 모든 `/api/**`를 가드. Bearer 토큰 + 쿠키 세션 **하이브리드 검증**(`auth.getUser`), 공개 라우트 화이트리스트.
- `server/routes/api/stocks/prepare-daily.ts`는 예외적으로 Bearer 토큰을 service role 키와 직접 비교(배치 트리거용).

### 2.3 배치 계층 (Edge Function 13개 + pg_cron)
일일 파이프라인: **KRX 갱신 → 뉴스 수집 → 종목 선정 → 결과 채점 → 랭킹 집계.**

| 함수 | 역할 | 스케줄(KST) |
|------|------|-------------|
| `fetch-market-news-periodically` | 변동성 종목 뉴스 수집 + Gemini 요약 | 매 정각 (주간 8개/야간 2개) |
| `update-krx-top-100` | 시총 상위 100 갱신 | 16:00 |
| `process-daily-results` | 종가 확인·예측 채점·포인트 지급 | 20:20 |
| `calculate-rankings` | 주간/월간/연간/누적 랭킹 | 20:30 |
| `update-naver-stocks` | 전체 종목 시세 갱신(50개 청크) | 20:20 |
| `select-daily-stocks` | 5종목 선정 + LLM 사유/목표가 | 21:20 |
| `fetch-economic-indicators` | investing.com 경제지표(cheerio 파싱) | 30분마다 |
| `fetch-news-summary` | 당일 종목 상세 요약 | 수동(cron 미등록) |
| `update-krx-stocks` | 상위 200 종목 정보 | 수동(cron 미등록) |
| `re-evaluate-recommendation` | 종목 재평가(STAY/WITHDRAW) | 수동(API) |
| `naver-userinfo-proxy` | 네이버 로그인 토큰 → OIDC 변환 | 클라이언트 호출 |
| `list-models` | Gemini 모델 목록(테스트) | 수동 |
| `transfer-hall-of-fame` | **index.ts 없음 (미구현)** | — |

- **외부 의존성**: Gemini API(`gemini-flash-latest`, 키 다중화 `GEMINI_API_KEY_1/2`), 네이버 금융 스크래핑, investing.com.
- **인프라**: pg_cron + pg_net, Vault에 저장된 service_role_key로 `net.http_post()` 호출. import_map은 `@supabase/supabase-js`, `@supabase/functions-js`, `cheerio` 3개만 선언.

## 3. 주요 구조적 리스크 (우선순위순)

> 상태 범례: ✅ 해결 · 🔄 진행/부분 · ⬜ 미착수

| # | 상태 | 리스크 | 위치 | 영향 |
|---|------|--------|------|------|
| 🔴 | ✅ | **`useStock.ts` 단일 거대 파일** — 영역별 컴포저블로 분리 완료(2089→294줄, 12개 컴포저블). `docs/refactor-usestock-plan.md` 참고 | composables | 유지보수성·테스트 불가·머지 충돌 |
| 🔴 | ✅ | **스키마 드리프트 폴백(에러 42703)** — 드리프트 점검(4개 컬럼 존재) 후 폴백 6곳 제거, 단일 쿼리로 정리 | useDailyStocks / useUserProfile / useRankings / api | 마이그레이션 미확정의 흔적, 정리 완료 |
| 🟠 | ✅ | **로직 복제** — `isEtf`/KST 계산 앱↔Edge Function 중복 → 두 `isEtf` 완전 동기화 확인(Deno 제약상 분리 불가, CLAUDE.md에 동기화 규칙 명문화) | utils/stock.ts ↔ functions | 한쪽만 고치면 불일치 |
| 🟠 | ✅ | **Streak 계산이 로컬 타임존** → `getKstDate()` 기반 KST 통일 완료 | useUserProfile.ts | UTC/KST 자정 불일치 버그 |
| 🟠 | ✅ | **인증 하이브리드 검증** — 8곳 인라인 복제 → `useStockClient.resolveUser()` 단일 진입점으로 통합 | useStockClient + 4파일 | 회귀 위험 높은 취약 지점 |
| 🟡 | ⬜ | **시나리오 10개 하드코딩**(약 1440개 캔들) | useScenario.ts | 번들 크기·확장성 |
| 🟡 | ⬜ | **배치 모니터링 부재** — DB 로그만, 외부 알림 없음 | 전체 Edge Function | 무음 실패 위험 |
| 🟡 | ✅ | **테스트/린트/타입체크** — 스택·환경·실행 완료. **typecheck 66→0·lint 353→0**·test 30✓·build✓ 전량 그린 | 프로젝트 전반 | 회귀 방어선 확보 |
| 🟡 | ⬜ | **`transfer-hall-of-fame` 미구현** | supabase/functions | 명세 대비 누락 |

## 4. 주목할 강점
- KST 시간 경계(21:20 선정 / 20:30 발표)를 `Intl.DateTimeFormat`으로 일관 처리 — 서버 TZ 독립적.
- 스키마 드리프트 방어 폴백, 낙관적 UI 업데이트+롤백 등 **운영 복원력 패턴**이 의도적으로 설계됨.
- 클라이언트 직접 쿼리(RLS) + 얇은 서버 API의 역할 분리가 명확.

## 5. 권장 개선 방향

### ✅ 완료
1. **(고) `useStock.ts` 분할** — `useDailyStocks`, `useWishlist`, `useRankings`, `useNews`, `useUserProfile`, `useAiHistory` 등 12개 컴포저블로 분리(2089→294줄).
2. **(고) 인증 하이브리드 로직 단일화** — `useStockClient.resolveUser()`를 단일 진입점으로 신설, 8곳의 인라인 `getUser()` 블록을 제거. 보안 가드(server 미들웨어·admin 미들웨어)는 유지. 클라이언트 게이팅은 기존 `resolveUserId()`와 동일하게 `getSession()` 채택(서버가 실제 인가 담당).
3. **(중) Streak 계산 KST 통일** — `getKstDate()` + UTC 자정 타임스탬프 비교로 TZ 무관하게 변경(`useUserProfile.ts`).
4. **(중) 중복 로직 정리** — `isEtf` 두 구현이 완전 동기화 상태임을 확인. Deno 런타임 제약상 앱↔Edge 분리는 불가, CLAUDE.md의 동기화 규칙으로 관리(코드 변경 불필요).
5. **(저) 죽은 코드 제거** — `app/stores/stock.ts`(하드코딩 목 데이터 Pinia 스토어) 삭제. pinia는 그 외 미사용.

### ⬜ 잔여 (우선순위순)
6. ✅ **(중) 42703 폴백 제거** — `scripts/check_schema_drift.ts`로 4개 컬럼(라이브 DB) 존재 확인 후 폴백 6곳 제거 완료(useDailyStocks 2·useRankings·useUserProfile·api). 단일 쿼리로 정리, build·test 통과.
7. **(저) 시나리오 데이터 DB 이관** — 하드코딩 10개 시나리오(약 1440 캔들)를 테이블로 이관(마이그레이션 신설 + `useScenario.ts` 로딩 경로 변경).
8. **(저) 배치 실패 외부 알림 도입** — Edge Function 무음 실패 대비(DB 로그 외 알림 채널).
9. **(저) `transfer-hall-of-fame` 구현** — `index.ts` 부재, 명세 대비 누락.
10. ✅ **(저) 테스트/린트/타입체크 도입** — Nuxt 4 표준 스택(vitest·@nuxt/eslint·vue-tsc) + 스크립트 + 스타터 테스트. **전 도구 그린 달성**: test 30 pass·build 통과·**typecheck 66→0·lint 353→0**. 추후 완화 규칙(`no-explicit-any` 등) 단계적 복원은 remaining-issues.md §7.
