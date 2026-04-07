-- [2026-04-08] 전체 종목 주가 갱신 스케줄 추가
-- KST 20:50 (UTC 11:50)에 update-naver-stocks 함수를 실행합니다.

SELECT cron.schedule('update-naver-stocks', '50 11 * * *', $$
  SELECT net.http_post(
    url := 'https://zmqjooidmibqrigziipq.supabase.co/functions/v1/update-naver-stocks',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1))
  )
$$);
