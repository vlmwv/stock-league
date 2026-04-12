-- daily_stocks 테이블에 AI 예측 결과 컬럼 추가
ALTER TABLE public.daily_stocks ADD COLUMN IF NOT EXISTS ai_result TEXT;
COMMENT ON COLUMN public.daily_stocks.ai_result IS 'AI의 예측 성공 여부 (win, lose, draw)';
