-- [2026-04-08] 일일 결과 처리 스케줄 변동
-- process-daily-results 함수는 네이버 증권 의존성을 제거하고 
-- update-krx-top-100과 update-naver-stocks가 반영한 데이터를 읽어 연산하도록 구성되었습니다.
-- 따라서 해당 갱신 작업들(20:20 실행) 이후에 실행되도록 20:25 KST (11:25 UTC)로 늦춥니다.

-- 기존 스케줄 제거
DO $$ 
BEGIN
    PERFORM cron.unschedule(jobname) FROM cron.job 
    WHERE jobname = 'process-daily-results';
EXCEPTION WHEN OTHERS THEN
END $$;

-- 20:25 KST 시간으로 재등록 (11:25 UTC)
SELECT cron.schedule('process-daily-results', '25 11 * * *', $$
  SELECT net.http_post(
    url := 'https://zmqjooidmibqrigziipq.supabase.co/functions/v1/process-daily-results',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1))
  )
$$);
