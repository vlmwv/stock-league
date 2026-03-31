-- 0. 컬럼 존재 여부 확인 및 추가 (이전 마이그레이션이 누락된 경우 대비)
ALTER TABLE public.stocks ADD COLUMN IF NOT EXISTS wishlist_count INTEGER DEFAULT 0;
ALTER TABLE public.stocks ADD COLUMN IF NOT EXISTS win_count INTEGER DEFAULT 0;

-- 1. 트리거 함수 보완 (COALESCE 추가로 NULL 방지)
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
    -- pending -> win 으로 변경시 +1
    IF (COALESCE(OLD.result, 'pending') != 'win' AND NEW.result = 'win') THEN
      UPDATE public.stocks 
      SET win_count = COALESCE(win_count, 0) + 1 
      WHERE id = NEW.stock_id;
    -- win -> (다른값) 으로 변경시 -1
    ELSIF (OLD.result = 'win' AND COALESCE(NEW.result, 'pending') != 'win') THEN
      UPDATE public.stocks 
      SET win_count = GREATEST(0, COALESCE(win_count, 0) - 1) 
      WHERE id = NEW.stock_id;
    END IF;
    RETURN NEW;

  -- 삭제시
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

-- 2. 모든 종목 데이터 재집계 (정확한 동기화)
UPDATE public.stocks s
SET 
  wishlist_count = (SELECT count(*) FROM public.wishlists w WHERE w.stock_id = s.id),
  win_count = (SELECT count(*) FROM public.predictions p WHERE p.stock_id = s.id AND p.result = 'win');
