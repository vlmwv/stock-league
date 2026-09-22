-- [2026-09-21] 랭킹 집계를 DB로 이관
-- 기존 calculate-rankings는 predictions를 PostgREST로 전건 조회해 Deno에서 집계했다.
-- PostgREST의 max_rows(기본 1000) 상한에 걸리면 에러 없이 잘린 데이터로 랭킹이 계산되고,
-- 데이터가 늘수록 전체 행을 함수 메모리로 옮기는 비용도 커진다.
-- 집계·순위·upsert를 한 문장으로 DB에서 수행해 잘림을 원천 제거한다.
--
-- 기간 키는 기존 JS 구현과 동일한 문자열을 생성한다(기존 rankings 행과 upsert 충돌이 맞아야 함):
--   weekly  '2026-W31'  = to_char(game_date, 'IYYY-"W"IW')  (ISO 주차)
--   monthly '2026-07'   = to_char(game_date, 'YYYY-MM')
--   yearly  '2026'      = to_char(game_date, 'YYYY')
--   all_time 'global'
-- 순위는 기존과 동일하게 승률 → 참여 횟수 순이며, 재실행 결과가 흔들리지 않도록
-- user_id를 마지막 타이브레이커로 추가했다(기존 JS는 동률 시 순서가 비결정적이었다).
CREATE OR REPLACE FUNCTION public.calculate_rankings()
RETURNS TABLE (ranking_rows integer, prediction_rows bigint)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_ranking_rows integer;
  v_prediction_rows bigint;
BEGIN
  SELECT COUNT(*) INTO v_prediction_rows
    FROM public.predictions
   WHERE result <> 'pending';

  WITH scored AS (
    SELECT user_id, result, game_date
      FROM public.predictions
     WHERE result <> 'pending'
  ),
  keyed AS (
    SELECT user_id, result, 'weekly'::text AS ranking_type, to_char(game_date, 'IYYY-"W"IW') AS period_key FROM scored
    UNION ALL
    SELECT user_id, result, 'monthly', to_char(game_date, 'YYYY-MM') FROM scored
    UNION ALL
    SELECT user_id, result, 'yearly', to_char(game_date, 'YYYY') FROM scored
    UNION ALL
    SELECT user_id, result, 'all_time', 'global' FROM scored
  ),
  aggregated AS (
    SELECT user_id,
           ranking_type,
           period_key,
           COUNT(*)::integer AS prediction_count,
           COUNT(*) FILTER (WHERE result = 'win')::integer AS win_count,
           ROUND(COUNT(*) FILTER (WHERE result = 'win')::numeric * 100 / COUNT(*), 2) AS win_rate
      FROM keyed
     GROUP BY user_id, ranking_type, period_key
  ),
  ranked AS (
    SELECT aggregated.*,
           ROW_NUMBER() OVER (
             PARTITION BY ranking_type, period_key
             ORDER BY win_rate DESC, prediction_count DESC, user_id
           )::integer AS rank
      FROM aggregated
  ),
  upserted AS (
    INSERT INTO public.rankings AS r
      (user_id, ranking_type, period_key, win_rate, prediction_count, win_count, rank, updated_at)
    SELECT user_id, ranking_type, period_key, win_rate, prediction_count, win_count, rank, timezone('utc', now())
      FROM ranked
    ON CONFLICT (user_id, ranking_type, period_key) DO UPDATE
      SET win_rate = EXCLUDED.win_rate,
          prediction_count = EXCLUDED.prediction_count,
          win_count = EXCLUDED.win_count,
          rank = EXCLUDED.rank,
          updated_at = EXCLUDED.updated_at
    RETURNING 1
  )
  SELECT COUNT(*)::integer INTO v_ranking_rows FROM upserted;

  RETURN QUERY SELECT v_ranking_rows, v_prediction_rows;
END;
$$;

-- 집계는 배치(service_role)만 실행한다. 클라이언트가 임의로 재집계를 트리거하지 못하도록 막는다.
REVOKE EXECUTE ON FUNCTION public.calculate_rankings() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.calculate_rankings() FROM anon, authenticated;
