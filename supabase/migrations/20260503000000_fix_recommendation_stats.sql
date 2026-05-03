-- 1. stocks 테이블에 누락된 last_recommendation_date 컬럼 추가
ALTER TABLE public.stocks ADD COLUMN IF NOT EXISTS last_recommendation_date DATE;

-- 2. 오늘의 종목(daily_stocks) 트리거 함수 고도화
-- INSERT, DELETE뿐만 아니라 UPDATE(상태 변경) 시에도 추천수와 최근 추천일을 동기화합니다.
CREATE OR REPLACE FUNCTION public.handle_daily_stock_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. INSERT: 추천수 증가 및 최근 추천일 갱신
  IF (TG_OP = 'INSERT') THEN
    IF (NEW.status != 'withdrawn') THEN
      UPDATE public.stocks 
      SET 
        ai_recommendation_count = COALESCE(ai_recommendation_count, 0) + 1,
        last_recommendation_date = GREATEST(COALESCE(last_recommendation_date, '1900-01-01'::DATE), NEW.game_date)
      WHERE id = NEW.stock_id;
    END IF;
    RETURN NEW;

  -- 2. DELETE: 추천수 감소 및 최근 추천일 재계산
  ELSIF (TG_OP = 'DELETE') THEN
    IF (OLD.status != 'withdrawn') THEN
      UPDATE public.stocks 
      SET 
        ai_recommendation_count = GREATEST(0, COALESCE(ai_recommendation_count, 0) - 1),
        last_recommendation_date = (
          SELECT max(game_date) 
          FROM public.daily_stocks 
          WHERE stock_id = OLD.stock_id AND id != OLD.id AND status != 'withdrawn'
        )
      WHERE id = OLD.stock_id;
    END IF;
    RETURN OLD;

  -- 3. UPDATE: 상태 변경 시 추천수 조정 (withdrawn <-> other)
  ELSIF (TG_OP = 'UPDATE') THEN
    -- 상태가 철회(withdrawn)로 변경된 경우: 추천수 감소
    IF (OLD.status != 'withdrawn' AND NEW.status = 'withdrawn') THEN
      UPDATE public.stocks 
      SET 
        ai_recommendation_count = GREATEST(0, COALESCE(ai_recommendation_count, 0) - 1),
        last_recommendation_date = (
          SELECT max(game_date) 
          FROM public.daily_stocks 
          WHERE stock_id = NEW.stock_id AND status != 'withdrawn'
        )
      WHERE id = NEW.stock_id;
    
    -- 상태가 철회에서 다시 활성화된 경우: 추천수 증가
    ELSIF (OLD.status = 'withdrawn' AND NEW.status != 'withdrawn') THEN
      UPDATE public.stocks 
      SET 
        ai_recommendation_count = COALESCE(ai_recommendation_count, 0) + 1,
        last_recommendation_date = GREATEST(COALESCE(last_recommendation_date, '1900-01-01'::DATE), NEW.game_date)
      WHERE id = NEW.stock_id;
      
    -- 종목 ID가 변경된 경우 (드문 케이스지만 안전을 위해 처리)
    ELSIF (OLD.stock_id != NEW.stock_id) THEN
      -- 이전 종목에서 차감
      UPDATE public.stocks SET ai_recommendation_count = GREATEST(0, ai_recommendation_count - 1) WHERE id = OLD.stock_id;
      -- 새 종목에 가산
      UPDATE public.stocks SET ai_recommendation_count = ai_recommendation_count + 1 WHERE id = NEW.stock_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거를 UPDATE 시에도 실행되도록 수정
DROP TRIGGER IF EXISTS on_daily_stock_change ON public.daily_stocks;
CREATE TRIGGER on_daily_stock_change
  AFTER INSERT OR DELETE OR UPDATE ON public.daily_stocks
  FOR EACH ROW EXECUTE FUNCTION public.handle_daily_stock_stats();

-- 3. 모든 데이터 기반 전수 동기화 (Resync)
UPDATE public.stocks s
SET 
  ai_recommendation_count = (
    SELECT count(*) 
    FROM public.daily_stocks ds 
    WHERE ds.stock_id = s.id AND ds.status != 'withdrawn'
  ),
  last_recommendation_date = (
    SELECT max(game_date) 
    FROM public.daily_stocks ds 
    WHERE ds.stock_id = s.id AND ds.status != 'withdrawn'
  );
