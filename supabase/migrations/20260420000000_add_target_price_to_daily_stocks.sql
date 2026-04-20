-- daily_stocks 테이블에 목표가 및 목표기준일 컬럼 추가
ALTER TABLE public.daily_stocks ADD COLUMN IF NOT EXISTS target_price INTEGER;
ALTER TABLE public.daily_stocks ADD COLUMN IF NOT EXISTS target_date DATE;

COMMENT ON COLUMN public.daily_stocks.target_price IS 'AI가 제시한 목표가';
COMMENT ON COLUMN public.daily_stocks.target_date IS 'AI가 제시한 목표기준일';
