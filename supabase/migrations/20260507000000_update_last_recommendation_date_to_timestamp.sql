-- 1. stocks 테이블의 last_recommendation_date 컬럼 타입을 DATE에서 TIMESTAMPTZ로 변경
-- 기존 데이터는 00:00:00 시각으로 변환됩니다.
ALTER TABLE public.stocks 
ALTER COLUMN last_recommendation_date TYPE TIMESTAMPTZ USING last_recommendation_date::TIMESTAMPTZ;

-- 2. 오늘의 종목(daily_stocks) 트리거 함수 수정
-- game_date(리그 날짜) 대신 created_at(실제 추천 시각)을 기준으로 동기화하도록 변경합니다.
CREATE OR REPLACE FUNCTION public.handle_daily_stock_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. INSERT: 추천수 증가 및 최근 추천일 갱신 (추천 시각 사용)
  IF (TG_OP = 'INSERT') THEN
    IF (NEW.status != 'withdrawn') THEN
      UPDATE public.stocks 
      SET 
        ai_recommendation_count = COALESCE(ai_recommendation_count, 0) + 1,
        last_recommendation_date = GREATEST(COALESCE(last_recommendation_date, '1900-01-01'::TIMESTAMPTZ), COALESCE(NEW.created_at, now()))
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
          SELECT max(created_at) 
          FROM public.daily_stocks 
          WHERE stock_id = OLD.stock_id AND id != OLD.id AND status != 'withdrawn'
        )
      WHERE id = OLD.stock_id;
    END IF;
    RETURN OLD;

  -- 3. UPDATE: 상태 변경 시 추천수 조정 (withdrawn <-> other)
  ELSIF (TG_OP = 'UPDATE') THEN
    -- 상태가 철회(withdrawn)로 변경된 경우: 추천수 감소 및 날짜 재계산
    IF (OLD.status != 'withdrawn' AND NEW.status = 'withdrawn') THEN
      UPDATE public.stocks 
      SET 
        ai_recommendation_count = GREATEST(0, COALESCE(ai_recommendation_count, 0) - 1),
        last_recommendation_date = (
          SELECT max(created_at) 
          FROM public.daily_stocks 
          WHERE stock_id = NEW.stock_id AND status != 'withdrawn'
        )
      WHERE id = NEW.stock_id;
    
    -- 상태가 철회에서 다시 활성화된 경우: 추천수 증가 및 날짜 갱신
    ELSIF (OLD.status = 'withdrawn' AND NEW.status != 'withdrawn') THEN
      UPDATE public.stocks 
      SET 
        ai_recommendation_count = COALESCE(ai_recommendation_count, 0) + 1,
        last_recommendation_date = GREATEST(COALESCE(last_recommendation_date, '1900-01-01'::TIMESTAMPTZ), COALESCE(NEW.created_at, now()))
      WHERE id = NEW.stock_id;
      
    -- 종목 ID가 변경된 경우
    ELSIF (OLD.stock_id != NEW.stock_id) THEN
      UPDATE public.stocks SET ai_recommendation_count = GREATEST(0, ai_recommendation_count - 1) WHERE id = OLD.stock_id;
      UPDATE public.stocks SET ai_recommendation_count = ai_recommendation_count + 1 WHERE id = NEW.stock_id;
      -- 날짜 재계산은 생략 (보통 발생하지 않는 케이스)
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 모든 데이터 기반 전수 동기화 (Resync)
-- 이제 모든 stocks의 최근 추천일이 실제 daily_stocks.created_at 시각으로 업데이트됩니다.
UPDATE public.stocks s
SET 
  ai_recommendation_count = (
    SELECT count(*) 
    FROM public.daily_stocks ds 
    WHERE ds.stock_id = s.id AND ds.status != 'withdrawn'
  ),
  last_recommendation_date = (
    SELECT max(created_at) 
    FROM public.daily_stocks ds 
    WHERE ds.stock_id = s.id AND ds.status != 'withdrawn'
  );
