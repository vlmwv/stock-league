-- 1. pg_cron 및 pg_net 확장 활성화
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Supabase Vault에 SERVICE_ROLE_KEY 등록
-- [주의] 아래의 첫 번째 인자('eyJhbG...') 부분에 본인 프로젝트의 Service Role Key를 입력하세요.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'service_role_key') THEN
        PERFORM vault.create_secret(
            'YOUR_SERVICE_ROLE_KEY_HERE', -- <--- 여기에 실제 키 입력
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

-- [주의] 'YOUR_PROJECT_REF' 부분을 본인의 Supabase Project ID로 변경하세요.
-- 1) 장중 뉴스/공시 주기적 수집
SELECT cron.schedule(
  'fetch-market-news-periodically',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/fetch-market-news-periodically',
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
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-daily-results',
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
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/calculate-rankings',
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
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/update-krx-top-100',
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
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/select-daily-stocks',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
    )
  )
  $$
);

-- 6) IR 전체 정보 수집 (매시간)
SELECT cron.schedule(
  'fetch-ir',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/fetch-ir',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
    )
  )
  $$
);
);
