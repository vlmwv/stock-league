# 잔여 이슈 백로그

> 작성일: 2026-06-16 · 대상: `ninanoai.com` (주식 예측 리그)
> 출처: [codebase-analysis.md](codebase-analysis.md) §5 · [refactor-usestock-plan.md](refactor-usestock-plan.md) §4
> 여러 문서에 흩어진 미착수 항목을 한 곳에 모은 실행 백로그. 완료 항목은 각 출처 문서에서 ✅로 관리한다.

## 0. 요약

| # | 우선순위 | 항목 | 영역 | 출처 |
|---|:---:|------|------|------|
| 1 | 🔴 고 | 42703 스키마 드리프트 폴백 제거 | composables | analysis §5-6 |
| 2 | ✅ 완료 | ~~`usePredictions` 분리 (7단계)~~ — `usePredictions.ts` 분리 완료 | composables | refactor §4 |
| 3 | ✅ 완료 | ~~`useStock` 파사드 최종 정리 (8단계)~~ — `notifications` useNews 이관, 95줄로 축소 | composables | refactor §4 |
| 4 | 🟡 저 | 시나리오 데이터 DB 이관 | useScenario + DB | analysis §5-7 |
| 5 | 🟡 저 | 배치 실패 외부 알림 도입 | Edge Function | analysis §5-8 |
| 6 | 🟡 저 | `transfer-hall-of-fame` 구현 | Edge Function | analysis §5-9 |
| 7 | 🟡 저 | 테스트/린트/타입체크 도입 | 프로젝트 전반 | analysis §5-10 |

---

## 1. 🔴 42703 스키마 드리프트 폴백 제거

- **현상**: Postgres 에러 `42703`(정의되지 않은 컬럼) 발생 시 최신 컬럼을 빼고 재쿼리하는 방어 분기가 `useDailyStocks`, `useUserProfile` 등에 상존.
- **위험**: 잘못 제거 시 프로덕션 쿼리 실패. **반드시 라이브 DB 스키마 확정 여부 확인 후** 진행.
- **접근**:
  1. `supabase/migrations/`의 최신 마이그레이션과 라이브 DB 실제 컬럼을 대조(드리프트 없음 확인).
  2. 드리프트가 없으면 폴백 분기와 재시도 쿼리 제거, 단일 쿼리로 정리.
  3. 폴백 제거 후 해당 컴포저블 동작 검증(오늘의 종목·프로필 통계).
- **참조**: analysis §3(🔴 두 번째 행), §5-6.

## 2. ✅ `usePredictions` 분리 (useStock 7단계) — 완료

- **결과**: 예측 제출/조회·참여자 수 로직을 `usePredictions.ts`로 분리(`myPredictions`/`participantCount`/`totalMemberCount` + `predict`/`fetchPredictions`/`fetchParticipantCount`/`getPrediction*`). `predict`의 리그 검증을 위해 `useDailyStocks` 결과를 주입. 파사드는 `...predictions` 스프레드로 반환 키 8개를 1:1 동일 유지(소비자 영향 0).
- **잔여 검증**: `node_modules` 설치 후 `npm run build` 통과 + 예측 제출/낙관적 업데이트 동작 스모크 확인 필요.
- **참조**: refactor-usestock-plan.md §4 (7단계).

## 3. ✅ `useStock` 파사드 최종 정리 (useStock 8단계) — 완료

- **결과**: `notifications` computed를 `useNews(recommended)`로 이관. 파사드는 크로스 도메인 오케스트레이션(`refreshAll`·`watch(user)`·`allPredicted`)과 반환 표면 조합만 남기고 **95줄**로 축소(착수 시 2089줄). 반환 키 전체 1:1 동일 → 소비자 영향 0.
- **잔여**: (선택) 9단계 소비자 마이그레이션 — 단일 도메인만 쓰는 컴포넌트를 직접 컴포저블로 교체. 강제 아님.
- **참조**: refactor-usestock-plan.md §4 (8단계).

## 4. 🟡 시나리오 데이터 DB 이관

- **현상**: `useScenario.ts`에 10개 시나리오(약 1440 캔들)가 하드코딩 → 번들 크기·확장성 부담.
- **접근**: 시나리오/캔들 테이블 마이그레이션 신설 → 데이터 시드 → `useScenario`의 로딩 경로를 메모리 상수에서 쿼리로 전환. 랭킹(`scenario_attempts`)과의 `scenario_id` 정합성 유지.
- **참조**: analysis §3(🟡), §5-7.

## 5. 🟡 배치 실패 외부 알림 도입

- **현상**: Edge Function 실패가 DB 로그에만 남아 무음 실패 위험(종목 선정·채점·랭킹 미동작 시 감지 지연).
- **접근**: 핵심 배치(`process-daily-results`, `calculate-rankings`, `select-daily-stocks`) 실패 시 외부 채널(슬랙/이메일 등) 알림. 공통 알림 헬퍼를 `supabase/functions/_shared`에 두는 안 검토.
- **참조**: analysis §3(🟡), §5-8.

## 6. 🟡 `transfer-hall-of-fame` 구현

- **현상**: 명세상 월간/연간 명예의 전당 이관 함수이나 `index.ts` 부재(미구현).
- **접근**: 월말/연말 cron 트리거 기준으로 랭킹 → 명예의 전당 테이블 이관 로직 구현 후 cron 등록.
- **참조**: analysis §3(🟡), §5-9.

## 7. 🟡 테스트/린트/타입체크 도입

- **현상**: 테스트·린터·타입체크 스크립트 전무 → 회귀 방어선 없음.
- **접근**: 최소 단위부터 — KST/Streak 등 순수 로직 유닛 테스트, 타입체크(`nuxi typecheck`) CI 편입 검토.
- **참조**: analysis §3(🟡), §5-10.
