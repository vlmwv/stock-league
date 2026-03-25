-- 기존 잘못된 URL을 가진 크론 작업 제거 및 실제 URL로 재등록
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
