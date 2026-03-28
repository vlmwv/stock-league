-- 크론 스케줄 수정: 주말 및 공휴일 처리를 고려하여 조정

-- 1) 기존 작업 제거
DO $$ 
BEGIN
    PERFORM cron.unschedule('select-daily-stocks') FROM cron.job WHERE jobname = 'select-daily-stocks';
    -- 결과 처리는 매일 두되, 로직에서 과거 누락분을 처리하도록 수정했으므로 유지해도 무방하나, 
    -- 장 마감 후에만 돌도록 명확히 함
EXCEPTION WHEN OTHERS THEN
END $$;

-- 2) 종목 선정 (select-daily-stocks)
-- 일, 월, 화, 수, 목, 금요일 밤(21:20 KST / 12:20 UTC)에 실행하여
-- 다음 영업일(월~금) 게임을 준비함
-- 금요일 밤 실행분은 월요일 게임이 됨
-- 토요일 밤에는 실행하지 않음
SELECT cron.schedule(
  'select-daily-stocks',
  '20 12 * * 0-5',
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

-- Note: 결과 처리(process-daily-results)는 이미 20:20 KST (11:20 UTC) 매일 실행으로 잡혀 있으며,
-- 수정된 에지 함수 로직이 .lte('game_date', today)를 사용하므로 매일 실행되어도 안전하며
-- 누락된 과거 데이터를 자동으로 찾아 처리하게 됩니다.
