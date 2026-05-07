-- Add market_cap column to stocks table
ALTER TABLE public.stocks ADD COLUMN IF NOT EXISTS market_cap BIGINT DEFAULT 0;

-- Add market_cap column to stock_price_history table
ALTER TABLE public.stock_price_history ADD COLUMN IF NOT EXISTS market_cap BIGINT DEFAULT 0;

-- Comment for documentation
COMMENT ON COLUMN public.stocks.market_cap IS '시가총액 (억 원)';
COMMENT ON COLUMN public.stock_price_history.market_cap IS '해당 일자 시가총액 (억 원)';
