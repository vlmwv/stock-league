-- 1. 과거 AI 추천 결과 데이터 업데이트 (상승=성공 로직 적용)
UPDATE public.daily_stocks ds
SET ai_result = (
    CASE 
        WHEN sph.change_rate > 0 THEN 'win'
        WHEN sph.change_rate = 0 THEN 'draw'
        ELSE 'lose'
    END
)
FROM public.stock_price_history sph
WHERE ds.stock_id = sph.stock_id 
  AND ds.game_date = sph.price_date
  AND (ds.ai_result IS NULL OR ds.ai_result = 'pending')
  AND ds.status = 'closed';

-- 2. 종목 테이블(stocks)의 AI 통계 데이터 동기화
UPDATE public.stocks s
SET 
  ai_win_count = (
    SELECT count(*) 
    FROM public.daily_stocks ds 
    WHERE ds.stock_id = s.id AND ds.ai_result = 'win'
  ),
  ai_processed_count = (
    SELECT count(*) 
    FROM public.daily_stocks ds 
    WHERE ds.stock_id = s.id AND ds.status = 'closed'
  );
