-- 1. news 테이블에 AI 점수 필드 추가
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS ai_score SMALLINT;

-- 2. 주석 추가
COMMENT ON COLUMN public.news.ai_score IS 'AI가 분석한 뉴스의 긍정/부정 및 중요도 점수 (0-100)';

-- 3. 기존 데이터 무결성을 위해 초기값 설정은 하지 않음 (NULL 허용)
