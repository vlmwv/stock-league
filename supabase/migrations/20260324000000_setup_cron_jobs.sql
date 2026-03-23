-- 1. pg_cron 및 pg_net 확장 활성화 (이미 활성화되어 있을 수 있음)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. 기존 동일 이름의 작업이 있다면 제거 (중복 등록 방지)
-- jobname이 있는 경우에만 제거하도록 처리
DO $$ 
BEGIN
    PERFORM cron.unschedule('fetch-market-news-periodically') FROM cron.job WHERE jobname = 'fetch-market-news-periodically';
    PERFORM cron.unschedule('process-daily-results') FROM cron.job WHERE jobname = 'process-daily-results';
    PERFORM cron.unschedule('calculate-rankings') FROM cron.job WHERE jobname = 'calculate-rankings';
    PERFORM cron.unschedule('update-krx-top-100') FROM cron.job WHERE jobname = 'update-krx-top-100';
    PERFORM cron.unschedule('select-daily-stocks') FROM cron.job WHERE jobname = 'select-daily-stocks';
    PERFORM cron.unschedule('transfer-hall-of-fame') FROM cron.job WHERE jobname = 'transfer-hall-of-fame';
EXCEPTION WHEN OTHERS THEN
    -- 에러 발생 시 무시
END $$;

-- 3. 각 배치 작업 스케줄링 등록
-- 주의: 아래 URL의 [PROJECT_REF]와 [SERVICE_ROLE_KEY]는 실제 값으로 변경해야 합니다.
-- (Supabase Dashboard -> Settings -> API에서 확인 가능)

-- 1) 장중 뉴스/공시 주기적 수집 (매 30분, 평일 KST 09:00~16:00 -> UTC 00:00~07:00)
SELECT cron.schedule(
  'fetch-market-news-periodically',
  '*/30 0-7 * * 1-5',
  $$
  SELECT net.http_post(
    url := 'https://[PROJECT_REF].supabase.co/functions/v1/fetch-market-news-periodically',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer [SERVICE_ROLE_KEY]"}'
  )
  $$
);

-- 2) 시세 정보 수집 및 결과 처리 (매일 KST 20:20 -> UTC 11:20)
SELECT cron.schedule(
  'process-daily-results',
  '20 11 * * *',
  $$
  SELECT net.http_post(
    url := 'https://[PROJECT_REF].supabase.co/functions/v1/process-daily-results',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer [SERVICE_ROLE_KEY]"}'
  )
  $$
);

-- 3) 랭킹 집계 및 순위 산정 (매일 KST 20:30 -> UTC 11:30)
SELECT cron.schedule(
  'calculate-rankings',
  '30 11 * * *',
  $$
  SELECT net.http_post(
    url := 'https://[PROJECT_REF].supabase.co/functions/v1/calculate-rankings',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer [SERVICE_ROLE_KEY]"}'
  )
  $$
);

-- 4) KRX 상위 100종목 업데이트 (매일 KST 20:40 -> UTC 11:40)
SELECT cron.schedule(
  'update-krx-top-100',
  '40 11 * * *',
  $$
  SELECT net.http_post(
    url := 'https://[PROJECT_REF].supabase.co/functions/v1/update-krx-top-100',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer [SERVICE_ROLE_KEY]"}'
  )
  $$
);

-- 5) 일일 5개 종목 선정 및 LLM 추천 요약 (매일 KST 21:20 -> UTC 12:20)
SELECT cron.schedule(
  'select-daily-stocks',
  '20 12 * * *',
  $$
  SELECT net.http_post(
    url := 'https://[PROJECT_REF].supabase.co/functions/v1/select-daily-stocks',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer [SERVICE_ROLE_KEY]"}'
  )
  $$
);

-- 6) 매월 초 명예의 전당 데이터 이관 (매월 1일 KST 09:05 -> UTC 00:05)
SELECT cron.schedule(
  'transfer-hall-of-fame',
  '5 0 1 * *',
  $$
  SELECT net.http_post(
    url := 'https://[PROJECT_REF].supabase.co/functions/v1/transfer-hall-of-fame',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer [SERVICE_ROLE_KEY]"}'
  )
  $$
);
