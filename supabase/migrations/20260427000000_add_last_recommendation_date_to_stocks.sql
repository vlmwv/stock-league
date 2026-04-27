-- 1. stocks 테이블에 최근 추천일 컬럼 추가
ALTER TABLE public.stocks ADD COLUMN IF NOT EXISTS last_recommendation_date DATE;

-- 2. 오늘의 종목(daily_stocks) 트리거 함수 수정
-- AI 추천 횟수와 최근 추천일을 함께 관리합니다.
CREATE OR REPLACE FUNCTION public.handle_daily_stock_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.stocks 
    SET 
      ai_recommendation_count = COALESCE(ai_recommendation_count, 0) + 1,
      last_recommendation_date = NEW.game_date
    WHERE id = NEW.stock_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.stocks 
    SET 
      ai_recommendation_count = GREATEST(0, COALESCE(ai_recommendation_count, 0) - 1),
      -- 삭제 시 최근 추천일을 다시 계산하는 것은 비용이 크므로 그대로 둡니다.
      -- 정렬 시 추천 횟수가 0인 종목은 어차피 하단에 위치하게 됩니다.
      last_recommendation_date = (
        SELECT max(game_date) 
        FROM public.daily_stocks 
        WHERE stock_id = OLD.stock_id AND id != OLD.id
      )
    WHERE id = OLD.stock_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 기존 데이터 기반 초기값 설정
UPDATE public.stocks s
SET 
  ai_recommendation_count = (SELECT count(*) FROM public.daily_stocks ds WHERE ds.stock_id = s.id),
  last_recommendation_date = (SELECT max(game_date) FROM public.daily_stocks ds WHERE ds.stock_id = s.id);
