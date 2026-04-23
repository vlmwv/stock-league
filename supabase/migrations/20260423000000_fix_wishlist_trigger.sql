-- 찜하기(wishlists) 트리거 함수 고도화 (폴더 다중 지원 대응)
CREATE OR REPLACE FUNCTION public.handle_wishlist_stats()
RETURNS TRIGGER AS $$
DECLARE
  other_exists BOOLEAN;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    -- 이 사용자가 동일 종목을 다른 폴더에 이미 담았는지 확인
    SELECT EXISTS (
      SELECT 1 FROM public.wishlists 
      WHERE user_id = NEW.user_id 
      AND stock_id = NEW.stock_id 
      AND id != NEW.id
    ) INTO other_exists;

    -- 처음 담는 경우에만 전체 찜수 증가
    IF NOT other_exists THEN
      UPDATE public.stocks SET wishlist_count = wishlist_count + 1 WHERE id = NEW.stock_id;
    END IF;
    RETURN NEW;

  ELSIF (TG_OP = 'DELETE') THEN
    -- 이 사용자가 동일 종목을 다른 폴더에 아직 담고 있는지 확인
    SELECT EXISTS (
      SELECT 1 FROM public.wishlists 
      WHERE user_id = OLD.user_id 
      AND stock_id = OLD.stock_id 
      AND id != OLD.id
    ) INTO other_exists;

    -- 더 이상 담긴 폴더가 없는 경우에만 전체 찜수 감소
    IF NOT other_exists THEN
      UPDATE public.stocks SET wishlist_count = wishlist_count - 1 WHERE id = OLD.stock_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
