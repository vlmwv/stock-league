-- [2026-04-07] 모든 크론 작업(CRON Jobs) 정상화 및 URL/인증 키 수정
-- 잘못된 Railway URL 또는 플레이스홀더로 설정된 작업을 실제 Edge Functions 주소로 변경합니다.

-- 1. 기존에 잘못 등록된 작업들 제거
DO $$ 
BEGIN
    PERFORM cron.unschedule(jobname) FROM cron.job 
    WHERE jobname IN (
        'fetch-market-news-periodically', 
        'process-daily-results', 
        'calculate-rankings', 
        'update-krx-top-100', 
        'select-daily-stocks', 
        'fetch-ir'
    );
EXCEPTION WHEN OTHERS THEN
END $$;

-- 2. 서비스 롤 키(Service Role Key)를 Vault에 재등록
-- .env 파일의 NUXT_SUPABASE_SERVICE_ROLE_KEY 값을 사용하여 인증 정보를 갱신합니다.
DELETE FROM vault.secrets WHERE name = 'service_role_key';
SELECT vault.create_secret(
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptcWpvb2lkbWlicXJpZ3ppaXBxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzkzMDMwNywiZXhwIjoyMDg5NTA2MzA3fQ.Drda7pthX3fbl1liUwzGEKz-3gpHqChzNS8cefiHyt0',
    'service_role_key'
);

-- 3. 각 기능별 자동화 스케줄 등록 (KST 기준 시간 설정)
-- 주: pg_cron은 UTC 기준으로 작동하므로 KST 시간에서 9시간을 뺀 값을 스케줄에 사용합니다.

-- 1) 뉴스 및 공시 수집 (매시간 정각)
SELECT cron.schedule('fetch-market-news-periodically', '0 * * * *', $$
  SELECT net.http_post(
    url := 'https://zmqjooidmibqrigziipq.supabase.co/functions/v1/fetch-market-news-periodically',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1))
  )
$$);

-- 2) 결과 처리 (매일 20:20 KST -> 11:20 UTC)
SELECT cron.schedule('process-daily-results', '20 11 * * *', $$
  SELECT net.http_post(
    url := 'https://zmqjooidmibqrigziipq.supabase.co/functions/v1/process-daily-results',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1))
  )
$$);

-- 3) 랭킹 집계 (매일 20:30 KST -> 11:30 UTC)
SELECT cron.schedule('calculate-rankings', '30 11 * * *', $$
  SELECT net.http_post(
    url := 'https://zmqjooidmibqrigziipq.supabase.co/functions/v1/calculate-rankings',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1))
  )
$$);

-- 4) KRX 상위 종목 정보 갱신 (매일 20:40 KST -> 11:40 UTC)
SELECT cron.schedule('update-krx-top-100', '40 11 * * *', $$
  SELECT net.http_post(
    url := 'https://zmqjooidmibqrigziipq.supabase.co/functions/v1/update-krx-top-100',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1))
  )
$$);

-- 5) 다음 영업일 종목 선정 (일~금 21:20 KST -> 12:20 UTC)
SELECT cron.schedule('select-daily-stocks', '20 12 * * 0-5', $$
  SELECT net.http_post(
    url := 'https://zmqjooidmibqrigziipq.supabase.co/functions/v1/select-daily-stocks',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1))
  )
$$);

-- 6) IR 정보 수집 (매시간 정각)
SELECT cron.schedule('fetch-ir', '0 * * * *', $$
  SELECT net.http_post(
    url := 'https://zmqjooidmibqrigziipq.supabase.co/functions/v1/fetch-ir',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1))
  )
$$);
