-- Add volume column to stocks table
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS volume BIGINT DEFAULT 0;

-- Add volume column to stock_price_history table
ALTER TABLE stock_price_history ADD COLUMN IF NOT EXISTS volume BIGINT DEFAULT 0;

-- Comment for documentation
COMMENT ON COLUMN stocks.volume IS '누적 거래량 (Shares)';
COMMENT ON COLUMN stock_price_history.volume IS '해당 일자 거래량 (Shares)';
