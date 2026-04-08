-- [2026-04-08] 전체 종목 주가 단건 수집 및 시총 상위 종목 수집 스케줄 조정
-- 사용자 요청에 따라 update-krx-top-100 및 update-naver-stocks 작업의 실행 시간을 20:20 (UTC 기준 11:20)으로 변경합니다.

-- 기존 스케줄 제거
DO $$ 
BEGIN
    PERFORM cron.unschedule(jobname) FROM cron.job 
    WHERE jobname IN ('update-krx-top-100', 'update-naver-stocks');
EXCEPTION WHEN OTHERS THEN
END $$;

-- 20:20 KST 시간으로 재등록 (11:20 UTC)
SELECT cron.schedule('update-krx-top-100', '20 11 * * *', $$
  SELECT net.http_post(
    url := 'https://zmqjooidmibqrigziipq.supabase.co/functions/v1/update-krx-top-100',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1))
  )
$$);

SELECT cron.schedule('update-naver-stocks', '20 11 * * *', $$
  SELECT net.http_post(
    url := 'https://zmqjooidmibqrigziipq.supabase.co/functions/v1/update-naver-stocks',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1))
  )
$$);
