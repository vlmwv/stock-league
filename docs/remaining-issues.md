# 잔여 이슈 백로그

> 작성일: 2026-06-16 · 갱신: 2026-07-29(완료 항목 #1~#4·#7 제거, 남은 작업만 유지) · 대상: `ninanoai.com` (주식 예측 리그)
> 출처: [codebase-analysis.md](codebase-analysis.md) §5 · [refactor-usestock-plan.md](refactor-usestock-plan.md) §4
> 여러 문서에 흩어진 미착수 항목을 한 곳에 모은 실행 백로그. 완료 항목은 각 출처 문서에서 ✅로 관리한다.

## 0. 요약

| # | 우선순위 | 항목 | 영역 | 출처 |
|---|:---:|------|------|------|
| 1 | ✅ 완료 | ~~42703 스키마 드리프트 폴백 제거~~ | composables | analysis §5-6 |
| 2 | ✅ 완료 | ~~`usePredictions` 분리 (7단계)~~ | composables | refactor §4 |
| 3 | ✅ 완료 | ~~`useStock` 파사드 최종 정리 (8단계)~~ | composables | refactor §4 |
| 4 | ✅ 완료 | ~~시나리오 데이터 DB 이관~~ | useScenario + DB | analysis §5-7 |
| 5 | 🟡 저 | 배치 실패 외부 알림 도입 | Edge Function | analysis §5-8 |
| 6 | 🚀 배포 대기 | `transfer-hall-of-fame` — 구현 완료, `functions deploy` 필요 | Edge Function | analysis §5-9 |

---

## 5. 🟡 배치 실패 외부 알림 도입

- **현상**: Edge Function 실패가 DB 로그에만 남아 무음 실패 위험(종목 선정·채점·랭킹 미동작 시 감지 지연).
- **접근**: 핵심 배치(`process-daily-results`, `calculate-rankings`, `select-daily-stocks`) 실패 시 외부 채널(슬랙/이메일 등) 알림. 공통 알림 헬퍼를 `supabase/functions/_shared`에 두는 안 검토.
- **참조**: analysis §3(🟡), §5-8.

## 6. 🚀 `transfer-hall-of-fame` 배포

- **구현(완료)**: `supabase/functions/transfer-hall-of-fame/index.ts` 작성. `calculate-rankings` 패턴 준수(env `SUPABASE_URL`/`SERVICE_ROLE_KEY`, `batch_execution_logs` 로깅, 에러 핸들링).
  - cron은 `fix_cron_urls.sql`에 이미 `'5 0 1 * *'`(매월 1일 09:05 KST)로 등록됨 → 별도 cron 추가 불필요.
  - 로직: **직전 달**(항상) rankings(`monthly`) 상위 `TOP_N=100`을 `hall_of_fame`으로 upsert. **1월 실행 시 직전 연도**(`yearly`)도 이관.
  - 매핑: `ranking_type`→`period_type`, `win_count`→`points`. `onConflict: user_id,period_type,period_key`로 **멱등**(재실행 안전).
  - 수동 백필: body `{ monthKey, yearKey }`로 특정 기간만 이관 가능.
- **잔여**: `supabase functions deploy transfer-hall-of-fame`로 배포(앱 Railway 배포와 별개).
- **참조**: analysis §3(🟡), §5-9.
