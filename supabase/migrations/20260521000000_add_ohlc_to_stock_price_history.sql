-- stock_price_history 테이블에 시가, 고가, 저가 컬럼 추가
ALTER TABLE public.stock_price_history ADD COLUMN IF NOT EXISTS open_price INT;
ALTER TABLE public.stock_price_history ADD COLUMN IF NOT EXISTS high_price INT;
ALTER TABLE public.stock_price_history ADD COLUMN IF NOT EXISTS low_price INT;

COMMENT ON COLUMN public.stock_price_history.open_price IS '시가';
COMMENT ON COLUMN public.stock_price_history.high_price IS '고가';
COMMENT ON COLUMN public.stock_price_history.low_price IS '저가';

-- 기존에 누적된 데이터 백필 (종가로 설정하여 정합성 유지)
UPDATE public.stock_price_history
SET open_price = close_price,
    high_price = close_price,
    low_price = close_price
WHERE open_price IS NULL OR high_price IS NULL OR low_price IS NULL;
