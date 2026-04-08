-- 1. stocks 테이블에 AI 추천 성과 컬럼 추가
ALTER TABLE public.stocks ADD COLUMN IF NOT EXISTS ai_win_count INTEGER DEFAULT 0;
ALTER TABLE public.stocks ADD COLUMN IF NOT EXISTS ai_processed_count INTEGER DEFAULT 0;

-- 2. 기존 데이터 기반 초기값 설정 (백필)
UPDATE public.stocks s
SET 
  ai_win_count = (
    SELECT count(*) 
    FROM public.daily_stocks ds 
    JOIN public.stock_price_history sph ON ds.stock_id = sph.stock_id AND ds.game_date = sph.price_date
    WHERE ds.stock_id = s.id AND ds.status = 'closed' AND sph.change_amount > 0
  ),
  ai_processed_count = (
    SELECT count(*) 
    FROM public.daily_stocks ds 
    WHERE ds.stock_id = s.id AND ds.status = 'closed'
  );
