-- 1. stocks 테이블에 AI 추천 횟수 컬럼 추가
ALTER TABLE public.stocks ADD COLUMN IF NOT EXISTS ai_recommendation_count INTEGER DEFAULT 0;

-- 2. 오늘의 종목(daily_stocks) 트리거 함수
-- 오늘의 종목으로 선정된 횟수를 자동으로 카운트합니다.
CREATE OR REPLACE FUNCTION public.handle_daily_stock_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.stocks SET ai_recommendation_count = ai_recommendation_count + 1 WHERE id = NEW.stock_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.stocks SET ai_recommendation_count = ai_recommendation_count - 1 WHERE id = OLD.stock_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 오늘의 종목 트리거 설정
DROP TRIGGER IF EXISTS on_daily_stock_change ON public.daily_stocks;
CREATE TRIGGER on_daily_stock_change
  AFTER INSERT OR DELETE ON public.daily_stocks
  FOR EACH ROW EXECUTE FUNCTION public.handle_daily_stock_stats();

-- 3. 기존 데이터 기반 초기값 설정
UPDATE public.stocks s
SET 
  ai_recommendation_count = (SELECT count(*) FROM public.daily_stocks ds WHERE ds.stock_id = s.id);
