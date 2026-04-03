-- 1. 찜하기(wishlists) 트리거 함수 보완
CREATE OR REPLACE FUNCTION public.handle_wishlist_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.stocks 
    SET wishlist_count = COALESCE(wishlist_count, 0) + 1 
    WHERE id = NEW.stock_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.stocks 
    SET wishlist_count = GREATEST(0, COALESCE(wishlist_count, 0) - 1) 
    WHERE id = OLD.stock_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 예측 성공(predictions) 트리거 함수 보완
CREATE OR REPLACE FUNCTION public.handle_prediction_win_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- 신규 입력시 'win'인 경우
  IF (TG_OP = 'INSERT') THEN
    IF (NEW.result = 'win') THEN
      UPDATE public.stocks 
      SET win_count = COALESCE(win_count, 0) + 1 
      WHERE id = NEW.stock_id;
    END IF;
    RETURN NEW;
  
  -- 업데이트시 결과가 'win'으로 변경된 경우
  ELSIF (TG_OP = 'UPDATE') THEN
    -- win이 아니었다가 win으로 변경될 때 +1
    IF (COALESCE(OLD.result, 'pending') != 'win' AND NEW.result = 'win') THEN
      UPDATE public.stocks 
      SET win_count = COALESCE(win_count, 0) + 1 
      WHERE id = NEW.stock_id;
    -- win이었다가 다른 값으로 변경될 때 -1
    ELSIF (OLD.result = 'win' AND COALESCE(NEW.result, 'pending') != 'win') THEN
      UPDATE public.stocks 
      SET win_count = GREATEST(0, COALESCE(win_count, 0) - 1) 
      WHERE id = NEW.stock_id;
    END IF;
    RETURN NEW;

  -- 삭제시 'win' 상태였다면 -1
  ELSIF (TG_OP = 'DELETE') THEN
    IF (OLD.result = 'win') THEN
      UPDATE public.stocks 
      SET win_count = GREATEST(0, COALESCE(win_count, 0) - 1) 
      WHERE id = OLD.stock_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. AI 추천/오늘의 종목(daily_stocks) 트리거 함수 보완
CREATE OR REPLACE FUNCTION public.handle_daily_stock_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.stocks 
    SET ai_recommendation_count = COALESCE(ai_recommendation_count, 0) + 1 
    WHERE id = NEW.stock_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.stocks 
    SET ai_recommendation_count = GREATEST(0, COALESCE(ai_recommendation_count, 0) - 1) 
    WHERE id = OLD.stock_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 모든 종목 데이터 재집계 및 동기화
UPDATE public.stocks s
SET 
  wishlist_count = (SELECT count(*) FROM public.wishlists w WHERE w.stock_id = s.id),
  win_count = (SELECT count(*) FROM public.predictions p WHERE p.stock_id = s.id AND p.result = 'win'),
  ai_recommendation_count = (SELECT count(*) FROM public.daily_stocks ds WHERE ds.stock_id = s.id);

-- 5. 인덱스 확인 (조인 성능 향상)
CREATE INDEX IF NOT EXISTS idx_wishlists_stock_id ON public.wishlists(stock_id);
CREATE INDEX IF NOT EXISTS idx_predictions_stock_id_result ON public.predictions(stock_id, result);
CREATE INDEX IF NOT EXISTS idx_daily_stocks_stock_id ON public.daily_stocks(stock_id);
