-- [2026-04-12] 결과 처리 스케줄 조정
-- update-naver-stocks (20:50 KST) 이후에 실행되도록 21:00 KST (12:00 UTC)로 변경합니다.

DO $$ 
BEGIN
    PERFORM cron.unschedule(jobname) FROM cron.job 
    WHERE jobname = 'process-daily-results';
EXCEPTION WHEN OTHERS THEN
END $$;

-- 21:00 KST 시간으로 재등록 (12:00 UTC)
SELECT cron.schedule('process-daily-results', '00 12 * * *', $$
  SELECT net.http_post(
    url := 'https://zmqjooidmibqrigziipq.supabase.co/functions/v1/process-daily-results',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1))
  )
$$);
