-- [2026-09-21] 채점 경로의 잘림·왕복 제거
-- process-daily-results는 (1) 대기 중인 예측을 전건 조회해 (종목, 날짜) 쌍을 만들고,
-- (2) 쌍마다 pending 예측을 다시 전건 조회한 뒤 1건씩 UPDATE하고 포인트 지급을 위해
-- profiles를 다시 SELECT/UPDATE했다.
-- 두 조회 모두 PostgREST의 max_rows(기본 1000) 상한에 조용히 잘리고,
-- 왕복 횟수가 예측 건수의 3배로 늘어 참여자가 늘면 함수 실행 시간 제한에 먼저 걸린다.
-- 아래 두 함수로 집계와 갱신을 DB에서 수행한다.

-- 대기 중인 (종목, 날짜) 쌍. 예측 행을 그대로 옮기지 않으므로 잘림이 없다.
CREATE OR REPLACE FUNCTION public.pending_prediction_pairs(p_max_game_date date)
RETURNS TABLE (stock_id bigint, game_date date)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT DISTINCT p.stock_id, p.game_date
    FROM public.predictions p
   WHERE p.result = 'pending'
     AND p.game_date <= p_max_game_date
   ORDER BY p.game_date, p.stock_id;
$$;

-- 한 종목·날짜의 대기 중인 예측을 한 문장으로 채점하고 포인트를 지급한다.
-- 판정 규칙은 기존 Deno 로직과 동일하다:
--   무승부  → 전원 'draw', 0점
--   예측 적중 → 'win', 리그 종목이면 p_win_points (리그 외 종목은 0점)
--   그 외    → 'lose', 0점
CREATE OR REPLACE FUNCTION public.grade_predictions(
  p_stock_id bigint,
  p_game_date date,
  p_outcome text,
  p_award_points boolean DEFAULT true,
  p_win_points integer DEFAULT 10
)
RETURNS TABLE (graded integer, awarded_points integer)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_graded integer;
  v_awarded integer;
BEGIN
  IF p_outcome NOT IN ('up', 'down', 'draw') THEN
    RAISE EXCEPTION '유효하지 않은 결과 값입니다: %', p_outcome;
  END IF;

  WITH graded_rows AS (
    UPDATE public.predictions
       SET result = CASE
                      WHEN p_outcome = 'draw' THEN 'draw'
                      WHEN prediction_type = p_outcome THEN 'win'
                      ELSE 'lose'
                    END,
           points_awarded = CASE
                              WHEN p_award_points
                               AND p_outcome <> 'draw'
                               AND prediction_type = p_outcome
                              THEN p_win_points
                              ELSE 0
                            END
     WHERE stock_id = p_stock_id
       AND game_date = p_game_date
       AND result = 'pending'
    RETURNING user_id, points_awarded
  ),
  totals AS (
    SELECT user_id, SUM(points_awarded)::integer AS points
      FROM graded_rows
     GROUP BY user_id
    HAVING SUM(points_awarded) > 0
  ),
  bumped AS (
    UPDATE public.profiles pr
       SET points = COALESCE(pr.points, 0) + t.points
      FROM totals t
     WHERE pr.id = t.user_id
    RETURNING t.points
  )
  SELECT (SELECT COUNT(*) FROM graded_rows)::integer,
         COALESCE((SELECT SUM(points) FROM bumped), 0)::integer
    INTO v_graded, v_awarded;

  RETURN QUERY SELECT v_graded, v_awarded;
END;
$$;

-- 채점은 배치(service_role)만 수행한다.
REVOKE EXECUTE ON FUNCTION public.pending_prediction_pairs(date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.pending_prediction_pairs(date) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grade_predictions(bigint, date, text, boolean, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.grade_predictions(bigint, date, text, boolean, integer) FROM anon, authenticated;
