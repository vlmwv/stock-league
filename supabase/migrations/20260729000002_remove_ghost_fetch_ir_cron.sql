-- [2026-07-29] 유령 크론 제거
-- fetch-ir 함수는 supabase/functions/에 존재하지 않아 매시간 net.http_post가 404로 실패하고 있었다.
-- (IR 데이터는 20260412224000_delete_ir_data.sql에서 이미 제거됨.)
DO $$
BEGIN
    PERFORM cron.unschedule('fetch-ir') FROM cron.job WHERE jobname = 'fetch-ir';
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;
