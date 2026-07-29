-- [2026-07-29] predictions 채점 핫패스 인덱스
-- process-daily-results가 매일 `result = 'pending' AND game_date <= today`로 미채점 예측을 조회한다.
-- predictions는 무한 증가 테이블이라 전체 스캔이 점점 느려진다.
-- pending 행만 담는 부분 인덱스(채점되면 인덱스에서 빠져 항상 작게 유지)로 조회를 최적화한다.
CREATE INDEX IF NOT EXISTS idx_predictions_pending_game_date
  ON public.predictions (game_date)
  WHERE result = 'pending';
