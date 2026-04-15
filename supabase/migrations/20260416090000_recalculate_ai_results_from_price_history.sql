-- game_date 기준 실제 종가 변화율로 AI 결과를 재산출합니다.
UPDATE public.daily_stocks ds
SET ai_result = CASE
  WHEN sph.change_rate > 0 THEN 'win'
  WHEN sph.change_rate < 0 THEN 'lose'
  ELSE 'draw'
END
FROM public.stock_price_history sph
WHERE ds.stock_id = sph.stock_id
  AND ds.game_date = sph.price_date
  AND ds.status = 'closed';

-- daily_stocks 기반으로 종목별 AI 집계를 재동기화합니다.
UPDATE public.stocks s
SET
  ai_win_count = (
    SELECT COUNT(*)
    FROM public.daily_stocks ds
    WHERE ds.stock_id = s.id
      AND ds.status = 'closed'
      AND ds.ai_result = 'win'
  ),
  ai_processed_count = (
    SELECT COUNT(*)
    FROM public.daily_stocks ds
    WHERE ds.stock_id = s.id
      AND ds.status = 'closed'
      AND ds.ai_result IN ('win', 'lose', 'draw')
  );
