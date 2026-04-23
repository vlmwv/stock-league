-- 경제 지표 자동 수집을 위한 크론 작업 등록 (30분마다 실행)
SELECT cron.schedule(
  'fetch-economic-indicators-cron',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://zmqjooidmibqrigziipq.supabase.co/functions/v1/fetch-economic-indicators',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
    ),
    body := jsonb_build_object('mode', 'auto-update')
  )
  $$
);
