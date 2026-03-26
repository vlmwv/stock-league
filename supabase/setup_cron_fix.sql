-- [주의] 이 스크립트는 Supabase SQL Editor에서 실행하세요.
-- 기존 크론 작업을 제거하고 정확한 설정과 키로 다시 등록합니다.

-- 1. pg_cron 및 pg_net 확장 활성화 확인
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. 서비스 롤 키 설정 (Vault 사용)
-- 아래의 'YOUR_SERVICE_ROLE_KEY' 부분을 실제 Service Role Key로 교체하세요.
-- (이미 등록되어 있다면 건너뛰거나 아래 DO 블록으로 업데이트됩니다)
DO $$
DECLARE
  v_service_role_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptcWpvb2lkbWlicXJpZ3ppaXBxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzkzMDMwNywiZXhwIjoyMDg5NTA2MzA3fQ.caByRDqXSCjY4txk_mRxBlT4cKG2O2jNuugbTo3RUfo'; -- <--- 여기에 실제 키 입력
BEGIN
    -- 기존 시크릿이 있으면 삭제 후 생성 (업데이트 목적)
    DELETE FROM vault.secrets WHERE name = 'service_role_key';
    
    PERFORM vault.create_secret(
        v_service_role_key,
        'service_role_key',
        '크론 작업용 서비스 롤 키'
    );
END $$;

-- 3. 기존 작업 제거 (중복 방지)
DO $$ 
BEGIN
    PERFORM cron.unschedule('select-daily-stocks') FROM cron.job WHERE jobname = 'select-daily-stocks';
EXCEPTION WHEN OTHERS THEN
END $$;

-- 4. 일일 5개 종목 선정 및 LLM 추천 요약 작업 등록
-- 실행 주기: 매일 21:20 KST (12:20 UTC)
-- 주의: 'zmqjooidmibqrigziipq' 부분이 본인 프로젝트 ID인지 확인하세요.
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

-- 확인 쿼리 예시:
-- SELECT * FROM cron.job;
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
