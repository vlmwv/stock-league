-- AI 분석 근거 저장을 위한 컬럼 추가
ALTER TABLE public.daily_stocks ADD COLUMN IF NOT EXISTS ai_reasoning TEXT;
COMMENT ON COLUMN public.daily_stocks.ai_reasoning IS 'AI가 해당 종목을 선정한 구체적인 논거 및 추론 과정';

ALTER TABLE public.ai_analysis_logs ADD COLUMN IF NOT EXISTS ai_reasoning TEXT;
COMMENT ON COLUMN public.ai_analysis_logs.ai_reasoning IS 'AI가 해당 종목을 분석한 구체적인 논거 및 추론 과정';

-- 시세 이력에 거래량 추가
ALTER TABLE public.stock_price_history ADD COLUMN IF NOT EXISTS volume BIGINT;
COMMENT ON COLUMN public.stock_price_history.volume IS '당일 거래량';

-- 종목 테이블에 최신 거래량 추가
ALTER TABLE public.stocks ADD COLUMN IF NOT EXISTS volume BIGINT;
COMMENT ON COLUMN public.stocks.volume IS '최근 거래량';
