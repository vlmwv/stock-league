-- [2026-07-29] 랭킹 집계 순서 교정
-- calculate-rankings가 process-daily-results보다 먼저 실행되어(20:30 vs 21:00 KST)
-- 당일 확정된 예측 결과가 다음 날 랭킹에야 반영되던 하루 지연 버그를 수정한다.
-- process-daily-results(예측 채점): 21:00 KST(00 12 UTC) → 이 이후로 랭킹 집계를 미룬다.
-- calculate-rankings(랭킹 집계): 21:10 KST(10 12 UTC)로 이동해 채점 완료 뒤 집계하도록 한다.

SELECT cron.schedule('calculate-rankings', '10 12 * * *', $$
  SELECT net.http_post(
    url := 'https://zmqjooidmibqrigziipq.supabase.co/functions/v1/calculate-rankings',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1))
  )
$$);
