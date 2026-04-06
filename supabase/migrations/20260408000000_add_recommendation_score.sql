-- daily_stocks 테이블에 AI 추천 점수 필드 추가
ALTER TABLE daily_stocks ADD COLUMN IF NOT EXISTS ai_score smallint;

-- 주석 추가
COMMENT ON COLUMN daily_stocks.ai_score IS 'AI가 분석한 익일 상승 확률/강도 점수 (0-100)';
