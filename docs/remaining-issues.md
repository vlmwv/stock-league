# 잔여 이슈 백로그

> 작성일: 2026-06-16 · 갱신: 2026-06-17(#1 폴백 제거·#7 도구 전량 그린 반영) · 대상: `ninanoai.com` (주식 예측 리그)
> 출처: [codebase-analysis.md](codebase-analysis.md) §5 · [refactor-usestock-plan.md](refactor-usestock-plan.md) §4
> 여러 문서에 흩어진 미착수 항목을 한 곳에 모은 실행 백로그. 완료 항목은 각 출처 문서에서 ✅로 관리한다.

## 0. 요약

| # | 우선순위 | 항목 | 영역 | 출처 |
|---|:---:|------|------|------|
| 1 | ✅ 완료 | ~~42703 스키마 드리프트 폴백 제거~~ — 드리프트 점검(4개 컬럼 존재) 후 폴백 6곳 제거 완료 | composables | analysis §5-6 |
| 2 | ✅ 완료 | ~~`usePredictions` 분리 (7단계)~~ — `usePredictions.ts` 분리 완료 | composables | refactor §4 |
| 3 | ✅ 완료 | ~~`useStock` 파사드 최종 정리 (8단계)~~ — `notifications` useNews 이관, 96줄로 축소 | composables | refactor §4 |
| 4 | ✅ 완료 | ~~시나리오 데이터 DB 이관~~ — 마이그레이션 적용·시드(10개/1056캔들)·anon RLS 조회 검증까지 완료 | useScenario + DB | analysis §5-7 |
| 5 | 🟡 저 | 배치 실패 외부 알림 도입 | Edge Function | analysis §5-8 |
| 6 | 🟡 저 | `transfer-hall-of-fame` 구현 | Edge Function | analysis §5-9 |
| 7 | ✅ 실행 | 테스트/린트/타입체크 — 환경 구성·전 도구 실행·베이스라인 확보 완료(아래 §7) | 프로젝트 전반 | analysis §5-10 |

---

## 1. ✅ 42703 스키마 드리프트 폴백 제거 — 완료

- **현상**: Postgres 에러 `42703`(정의되지 않은 컬럼) 발생 시 최신 컬럼을 빼고 재쿼리하는 방어 분기가 `useDailyStocks`, `useUserProfile` 등에 상존.
- **위험**: 잘못 제거 시 프로덕션 쿼리 실패. **반드시 라이브 DB 스키마 확정 여부 확인 후** 진행.
- **사전 점검 결과(2026-06-16)**: `npx tsx scripts/check_schema_drift.ts` 실행 → `profiles.gender`·`profiles.role`·`daily_stocks.ai_result`·`daily_stocks.status` **4개 컬럼 모두 라이브 DB에 존재(드리프트 없음)**.
- **제거 결과(2026-06-17)**: 폴백 6곳 제거 완료 — `useDailyStocks`(ai_result 재시도 + latest fallback 재시도 2곳), `useRankings`(gender), `useUserProfile`(gender/role), `server/api/rankings.get.ts`(gender). 단일 쿼리로 정리하고 `let`→`const` 정돈. `npm run build`·`npm run test`(30) 통과, 앱/서버 코드에 `42703` 잔재 0.
- **접근**:
  1. `supabase/migrations/`의 최신 마이그레이션과 라이브 DB 실제 컬럼을 대조(드리프트 없음 확인).
  2. 드리프트가 없으면 폴백 분기와 재시도 쿼리 제거, 단일 쿼리로 정리.
  3. 폴백 제거 후 해당 컴포저블 동작 검증(오늘의 종목·프로필 통계).
- **참조**: analysis §3(🔴 두 번째 행), §5-6.

## 2. ✅ `usePredictions` 분리 (useStock 7단계) — 완료

- **결과**: 예측 제출/조회·참여자 수 로직을 `usePredictions.ts`로 분리(`myPredictions`/`participantCount`/`totalMemberCount` + `predict`/`fetchPredictions`/`fetchParticipantCount`/`getPrediction*`). `predict`의 리그 검증을 위해 `useDailyStocks` 결과를 주입. 파사드는 `...predictions` 스프레드로 반환 키 8개를 1:1 동일 유지(소비자 영향 0).
- **자동 검증 완료**: `npm run build`·`test`(30)·`typecheck`(0)·`lint`(0) 전량 그린(§8-0). 남은 것은 브라우저 수동 스모크(§8-1)뿐.
- **참조**: refactor-usestock-plan.md §4 (7단계).

## 3. ✅ `useStock` 파사드 최종 정리 (useStock 8단계) — 완료

- **결과**: `notifications` computed를 `useNews(recommended)`로 이관. 파사드는 크로스 도메인 오케스트레이션(`refreshAll`·`watch(user)`·`allPredicted`)과 반환 표면 조합만 남기고 **96줄**로 축소(착수 시 2089줄). 반환 키 전체 1:1 동일 → 소비자 영향 0.
- **잔여**: (선택) 9단계 소비자 마이그레이션 — 단일 도메인만 쓰는 컴포넌트를 직접 컴포저블로 교체. 강제 아님.
- **참조**: refactor-usestock-plan.md §4 (8단계).

## 4. ✅ 시나리오 데이터 DB 이관 — 완료(DB 적용·시드·검증)

- **현상(과거)**: `useScenario.ts`에 10개 시나리오(절차적 생성 캔들)가 하드코딩 → 번들 크기·확장성 부담.
- **코드 변경(완료)**:
  - 마이그레이션 `supabase/migrations/20260617000000_create_scenarios.sql` — `public.scenarios`(메타 + `candles`/`events` JSONB, public read RLS). id 1~10 유지 → `scenario_attempts.scenario_id` 정합.
  - 원본 데이터(생성기 포함)를 `scripts/scenario-seed-data.ts`로 이동 → **앱 번들에서 분리**(useScenario 628→152줄).
  - 시드 스크립트 `scripts/seed_scenarios.ts` — 생성기를 실행해 구운 캔들/이벤트를 `scenarios`에 upsert.
  - `useScenario`는 `useAsyncData('scenarios')`로 DB 조회(SSR 로드, 반환 표면 `scenarios` 불변 → 소비자 영향 0).
- **DB 적용·검증(완료, 2026-06-18)**:
  - `supabase db push` → `20260617000000_create_scenarios.sql` 원격 적용.
  - `npx tsx scripts/seed_scenarios.ts` → **10개 시나리오 / 1056 캔들** upsert.
  - anon 키(RLS public read) 조회로 10행 정상 확인(각 시나리오 캔들/이벤트/ETF 일치).
- **선택 후속**: 무결성 FK 추가(마이그레이션 주석 참고), `supabase gen types`로 `scenarios` 타입 반영 → `(supabase as any)` 캐스팅 정식화. 브라우저 스모크(§8-5 마지막 항목).
- **참조**: analysis §3(🟡), §5-7.

## 5. 🟡 배치 실패 외부 알림 도입

- **현상**: Edge Function 실패가 DB 로그에만 남아 무음 실패 위험(종목 선정·채점·랭킹 미동작 시 감지 지연).
- **접근**: 핵심 배치(`process-daily-results`, `calculate-rankings`, `select-daily-stocks`) 실패 시 외부 채널(슬랙/이메일 등) 알림. 공통 알림 헬퍼를 `supabase/functions/_shared`에 두는 안 검토.
- **참조**: analysis §3(🟡), §5-8.

## 6. 🟡 `transfer-hall-of-fame` 구현

- **현상**: 명세상 월간/연간 명예의 전당 이관 함수이나 `index.ts` 부재(미구현).
- **접근**: 월말/연말 cron 트리거 기준으로 랭킹 → 명예의 전당 테이블 이관 로직 구현 후 cron 등록.
- **참조**: analysis §3(🟡), §5-9.

## 7. ✅ 테스트/린트/타입체크 — 환경 구성·실행·베이스라인 확보 완료

- **도입 내용**:
  - 스크립트: `typecheck`(`nuxt typecheck`), `lint`/`lint:fix`(eslint), `test`/`test:watch`(vitest).
  - devDeps: `@nuxt/eslint`, `eslint`, `vue-tsc`, `typescript`, `vitest`, `@nuxt/test-utils`, `@vue/test-utils`, `happy-dom`.
  - 설정: `nuxt.config.ts`에 `@nuxt/eslint` 모듈, `eslint.config.mjs`(점진 도입용 완화 규칙 + scripts/·**scratch/**·supabase/ 제외), `vitest.config.ts`(기본 node 환경).
  - 스타터 테스트: `test/utils/stock.test.ts` — `isEtf`/`cleanLlmSummary`/`decodeHtmlEntities`/`getNewsUrl`/`repairNewsUrl` 순수 함수.
- **실행 결과(2026-06-16, `npm install --legacy-peer-deps` 후)**:
  - ✅ `npm run test` — **30 passed**(node·nuxt 두 환경에서 스타터 15개씩).
  - ✅ `npm run build` — 통과(타입/번들 에러 0). 분리 리팩터링 핵심 검증 완료.
  - ✅ `npm run typecheck` — **66 → 0 errors** (2026-06-17 전량 수정 완료). `indices.get.ts` 32건은 `FALLBACK_INDICES` `as const` 튜플화로 일괄 해소, `never` 계열은 `(client as any)` 캐스팅, 서버 라우트 `user`는 401 가드 추가, `WishlistItem.group_id` `number|null` 모델 보정 등. 부수로 `daily.vue`의 `pending`(항상 undefined였던 잠재버그) 정상 노출.
  - ✅ `npm run lint` — `lint:fix`(353→46) 후 잔여 **46 → 0** 전량 정리 완료. 미사용 컴포저블 구조분해/지역변수 제거, 미사용 인자 정리(미들웨어 `()`, `catch {}`), `defineProps` 무명화, `offset` 무용 초기화 제거, 죽은 함수(prevMonth/nextMonth·handleToggleHeart) 제거, `appDataDir/**` 린트 제외.
- **잔여(점진)**:
  1. ✅ typecheck 66건 → 0 (완료). 추후 `app/types/database.types.ts`(supabase gen types) 도입 시 `(client as any)` 캐스팅을 정식 타입으로 대체 가능.
  2. ✅ lint 0건 달성(완료). 추후 완화 규칙(`no-explicit-any` 등) 단계적 복원 가능.
  3. (선택) CI에 typecheck/lint/test 편입.
- **참조**: analysis §3(🟡), §5-10.

---

## 8. 환경 구성 시 확인 범위 (스모크 체크리스트)

> 자동 검증(빌드·테스트·타입체크·린트)은 8-0에서 완료(전량 그린, 2026-06-17). 남은 항목은 **브라우저 수동 스모크**(8-1 ~ 8-3)뿐이다.

### 8-0. 빌드·도구 기본 (2026-06-16 실행 완료)
- [x] `npm install --legacy-peer-deps` 성공(266 packages 추가, peer 충돌 없음)
- [x] `npm run build` 통과(타입/번들 에러 0) — 분리 리팩터링 핵심 검증
- [x] `npm run test` — 스타터 테스트 **30 passed**
- [x] `npm run typecheck` — **66 → 0 errors** (전량 수정 완료)
- [x] `npm run lint` — **353 → 0** (전량 정리 완료)

### 8-1. useStock 분리 7~8단계 (커밋 `524ad0b`)
- [ ] 메인/오늘의 예측: 종목 표시, **예측 제출(낙관적 업데이트·롤백)**, 참여자 수 갱신
- [ ] 상단 알림 벨(`notifications`): 추천 종목 + 경제지표 표시(`useNews` 이관 후)
- [ ] info 페이지: 경제지표(`recent_indicators`) 로딩
- [ ] 시나리오 게임: 도전 이력/제출 동작(`fetchUserAttempts`·`submitScenarioAttempt`)

### 8-2. 인증 하이브리드 단일화 (#2, 커밋 `e3ceb72`)
- [ ] 로그인 직후 무한 리다이렉트 없음(game/scenarios/scenario-game 진입)
- [ ] 비로그인 상태에서 예측/도전 시 로그인 안내 모달 정상
- [ ] `resolveUser()` 경로(getSession) — 새로고침 직후 유저 인식

### 8-3. Streak KST 통일 (#5, 커밋 `e3ceb72`)
- [ ] 마이페이지 연속 예측(streak) 수치가 KST 자정 기준으로 정확

### 8-4. 42703 폴백 사전 점검 (#1 준비) — 2026-06-16 완료
- [x] `npx tsx scripts/check_schema_drift.ts` 실행 → **4개 컬럼 모두 존재 ✅ → #1 착수 가능**

### 8-5. 시나리오 DB 이관 (#4) — 2026-06-18 적용 완료
- [x] 마이그레이션 적용(`20260617000000_create_scenarios.sql`) — `supabase db push`
- [x] `npx tsx scripts/seed_scenarios.ts` → 10개 시나리오·**1056 캔들** upsert 확인
- [x] anon(RLS public read) 조회 10행 정상 검증
- [ ] (브라우저) 게임 라운지/시나리오 목록 10개 노출, 시나리오 게임 진입·차트·도전 정상
- [ ] (배포 순서) 마이그레이션 → 시드 → 앱 배포. 시드 전 배포 시 목록이 비므로 주의
