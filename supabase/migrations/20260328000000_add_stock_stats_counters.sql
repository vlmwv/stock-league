-- 1. stocks 테이블에 통계용 컬럼 추가
ALTER TABLE public.stocks ADD COLUMN IF NOT EXISTS wishlist_count INTEGER DEFAULT 0;
ALTER TABLE public.stocks ADD COLUMN IF NOT EXISTS win_count INTEGER DEFAULT 0;

-- 2. 찜하기(wishlists) 트리거 함수
CREATE OR REPLACE FUNCTION public.handle_wishlist_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.stocks SET wishlist_count = wishlist_count + 1 WHERE id = NEW.stock_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.stocks SET wishlist_count = wishlist_count - 1 WHERE id = OLD.stock_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 찜하기 트리거 설정
DROP TRIGGER IF EXISTS on_wishlist_change ON public.wishlists;
CREATE TRIGGER on_wishlist_change
  AFTER INSERT OR DELETE ON public.wishlists
  FOR EACH ROW EXECUTE FUNCTION public.handle_wishlist_stats();

-- 3. 예측 성공(predictions) 트리거 함수
CREATE OR REPLACE FUNCTION public.handle_prediction_win_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- 신규 입력시 'win'인 경우 (보통은 pending이지만 혹시 모르니)
  IF (TG_OP = 'INSERT') THEN
    IF (NEW.result = 'win') THEN
      UPDATE public.stocks SET win_count = win_count + 1 WHERE id = NEW.stock_id;
    END IF;
    RETURN NEW;
  
  -- 업데이트시 결과가 'win'으로 변경된 경우
  ELSIF (TG_OP = 'UPDATE') THEN
    -- pending -> win 으로 변경시 +1
    IF (OLD.result != 'win' AND NEW.result = 'win') THEN
      UPDATE public.stocks SET win_count = win_count + 1 WHERE id = NEW.stock_id;
    -- win -> (다른값) 으로 변경시 -1
    ELSIF (OLD.result = 'win' AND NEW.result != 'win') THEN
      UPDATE public.stocks SET win_count = win_count - 1 WHERE id = NEW.stock_id;
    END IF;
    RETURN NEW;

  -- 삭제시 (거의 없겠지만)
  ELSIF (TG_OP = 'DELETE') THEN
    IF (OLD.result = 'win') THEN
      UPDATE public.stocks SET win_count = win_count - 1 WHERE id = OLD.stock_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 예측 성공 트리거 설정
DROP TRIGGER IF EXISTS on_prediction_result_change ON public.predictions;
CREATE TRIGGER on_prediction_result_change
  AFTER INSERT OR UPDATE OR DELETE ON public.predictions
  FOR EACH ROW EXECUTE FUNCTION public.handle_prediction_win_stats();

-- 4. 기존 데이터 기반 초기값 설정 (한 번만 실행)
UPDATE public.stocks s
SET 
  wishlist_count = (SELECT count(*) FROM public.wishlists w WHERE w.stock_id = s.id),
  win_count = (SELECT count(*) FROM public.predictions p WHERE p.stock_id = s.id AND p.result = 'win');
