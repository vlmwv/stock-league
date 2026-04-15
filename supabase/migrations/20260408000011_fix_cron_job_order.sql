-- [2026-04-08] 배치 작업 실행 순서 최적화 및 스케줄 조정
-- 주식 가격 정보 갱신(update-krx-top-100)을 장 마감 후 즉시로 앞당겨, 결과 처리(process-daily-results) 시 최신 데이터가 반영되도록 합니다.

-- 1. 기존 작업 제거 (시간 조정을 위해)
SELECT cron.unschedule('update-krx-top-100');

-- 2. KRX 상위 종목 정보 갱신 시간 변경 (매일 16:00 KST -> 07:00 UTC)
-- 기존 20:40 KST(11:40 UTC)에서 16:00 KST(07:00 UTC)로 변경
SELECT cron.schedule('update-krx-top-100', '0 7 * * *', $$
  SELECT net.http_post(
    url := 'https://zmqjooidmibqrigziipq.supabase.co/functions/v1/update-krx-top-100',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1))
  )
$$);

-- 3. 참고: 다른 작업들은 기존 시간 유지 (KST 기준)
-- process-daily-results: 20:20 (이제 16:00에 업데이트된 가격을 사용하게 됨)
-- calculate-rankings: 20:30
-- select-daily-stocks: 21:20
