# 배치 기능 검증 가이드 (Batch Verification Guide)

본 문서는 **주식 예측 리그** 프로젝트의 배치 작업(Supabase Edge Functions + pg_cron)이 정상적으로 동작하는지 확인하고 디버깅하는 방법을 설명합니다.

---

## 1. 배치 작업 목록 및 확인 포인트

현재 등록된 주요 배치 작업과 각 작업이 업데이트하는 데이터베이스 테이블입니다.

| 작업명 (Cron Job Name) | 실행 주기 (KST 기준) | 주요 역할 | 확인용 SQL / 테이블 |
| :--- | :--- | :--- | :--- |
| `fetch-market-news-periodically` | 평일 09:00~16:00 (30분 간격) | 최신 뉴스 수집 및 AI 요약 | `SELECT * FROM news ORDER BY published_at DESC LIMIT 10;` |
| `process-daily-results` | 매일 20:20 | 당일 주가 확정 및 예측 결과 처리 | `SELECT * FROM daily_stocks WHERE game_date = current_date;` |
| `calculate-rankings` | 매일 20:30 | 유저별 승률 및 랭킹 산정 | `SELECT * FROM rankings ORDER BY updated_at DESC LIMIT 10;` |
| `update-krx-top-100` | 매일 20:40 | 시가총액 상위 100종목 갱신 | `SELECT * FROM stocks WHERE market_cap_rank <= 100;` |
| `select-daily-stocks` | 매일 21:20 | 다음 날 게임용 5개 종목 선정 | `SELECT * FROM daily_stocks WHERE game_date = current_date + 1;` |

---

## 2. 검증 방법 1: SQL을 통한 실행 이력 확인

Supabase **SQL Editor**에서 아래 쿼리를 실행하여 배치(pg_cron)가 실제로 호출되었는지 확인합니다.

### 2.1 최근 배치 실행 성공 여부 확인
```sql
-- 최근 20개의 크론 작업 실행 기록 확인
SELECT 
    jobid, 
    jobname, 
    status, 
    return_message, 
    start_time, 
    end_time 
FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 20;
```
- `status`가 `succeeded`이면 정상 호출된 것입니다.
- `failed`인 경우 `return_message`를 확인하세요.

---

## 3. 검증 방법 2: Supabase 대시보드 로그 확인

Edge Function 내부에서 발생한 세부 에러(API 호출 실패, 로직 에러 등)는 대시보드에서 확인할 수 있습니다.

1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. **Edge Functions** 메뉴 선택
3. 확인하려는 함수(예: `process-daily-results`) 클릭
4. **Logs** 탭 클릭
5. `Error` 또는 `Warning` 레벨 로그가 있는지 확인

---

## 4. 검증 방법 3: 수동 트리거 (Immediate Test)

배치 주기까지 기다리지 않고 즉시 테스트하고 싶은 경우, `curl`을 사용하여 수동으로 호출할 수 있습니다.

### 4.1 스크립트 사용 (권장)
프로젝트 루트에서 제공되는 테스트 스크립트를 실행합니다.
```bash
# 실행 권한 부여 (최초 1회)
chmod +x scripts/test-batch.sh

# 특정 배치 수동 실행 (예: rankings)
./scripts/test-batch.sh calculate-rankings
```

### 4.2 직접 curl 호출
```bash
curl -X POST "https://<PROJECT_ID>.supabase.co/functions/v1/<FUNCTION_NAME>" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json"
```
> [!IMPORTANT]
> 반드시 `SERVICE_ROLE_KEY`를 사용해야 인증을 통과합니다. (Anon Key로는 권한 부족 오류 발생 가능)
