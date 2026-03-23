-- 1. pg_cron 및 pg_net 확장 활성화
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Supabase Vault에 SERVICE_ROLE_KEY 등록
-- 이미 존재하는 경우 업데이트하거나 건너뛰도록 DO 블록으로 처리합니다.
DO $$
BEGIN
    -- 'service_role_key'라는 이름의 시크릿이 없으면 생성합니다.
    IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'service_role_key') THEN
        PERFORM vault.create_secret(
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptcWpvb2lkbWlicXJpZ3ppaXBxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzkzMDMwNywiZXhwIjoyMDg5NTA2MzA3fQ.Drda7pthX3fbl1liUwzGEKz-3gpHqChzNS8cefiHyt0',
            'service_role_key',
            '크론 작업용 서비스 롤 키'
        );
    END IF;
END $$;

-- 3. 기존 동일 이름의 작업 제거 (중복 방지)
DO $$ 
BEGIN
    PERFORM cron.unschedule('fetch-market-news-periodically') FROM cron.job WHERE jobname = 'fetch-market-news-periodically';
    PERFORM cron.unschedule('process-daily-results') FROM cron.job WHERE jobname = 'process-daily-results';
    PERFORM cron.unschedule('calculate-rankings') FROM cron.job WHERE jobname = 'calculate-rankings';
    PERFORM cron.unschedule('update-krx-top-100') FROM cron.job WHERE jobname = 'update-krx-top-100';
    PERFORM cron.unschedule('select-daily-stocks') FROM cron.job WHERE jobname = 'select-daily-stocks';
    PERFORM cron.unschedule('transfer-hall-of-fame') FROM cron.job WHERE jobname = 'transfer-hall-of-fame';
EXCEPTION WHEN OTHERS THEN
END $$;

-- 4. 각 배치 작업 스케줄링 등록 (Vault 사용)

-- 1) 장중 뉴스/공시 주기적 수집
SELECT cron.schedule(
  'fetch-market-news-periodically',
  '*/30 0-7 * * 1-5',
  $$
  SELECT net.http_post(
    url := 'https://zmqjooidmibqrigziipq.supabase.co/functions/v1/fetch-market-news-periodically',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
    )
  )
  $$
);

-- 2) 시세 정보 수집 및 결과 처리
SELECT cron.schedule(
  'process-daily-results',
  '20 11 * * *',
  $$
  SELECT net.http_post(
    url := 'https://zmqjooidmibqrigziipq.supabase.co/functions/v1/process-daily-results',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
    )
  )
  $$
);

-- 3) 랭킹 집계 및 순위 산정
SELECT cron.schedule(
  'calculate-rankings',
  '30 11 * * *',
  $$
  SELECT net.http_post(
    url := 'https://zmqjooidmibqrigziipq.supabase.co/functions/v1/calculate-rankings',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
    )
  )
  $$
);

-- 4) KRX 상위 100종목 업데이트
SELECT cron.schedule(
  'update-krx-top-100',
  '40 11 * * *',
  $$
  SELECT net.http_post(
    url := 'https://zmqjooidmibqrigziipq.supabase.co/functions/v1/update-krx-top-100',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
    )
  )
  $$
);

-- 5) 일일 5개 종목 선정 및 LLM 추천 요약
SELECT cron.schedule(
  'select-daily-stocks',
  '20 12 * * *',
  $$
  SELECT net.http_post(
    url := 'https://zmqjooidmibqrigziipq.supabase.co/functions/v1/select-daily-stocks',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
    )
  )
  $$
);

-- 6) 매월 초 명예의 전당 데이터 이관
SELECT cron.schedule(
  'transfer-hall-of-fame',
  '5 0 1 * *',
  $$
  SELECT net.http_post(
    url := 'https://zmqjooidmibqrigziipq.supabase.co/functions/v1/transfer-hall-of-fame',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
    )
  )
  $$
);
