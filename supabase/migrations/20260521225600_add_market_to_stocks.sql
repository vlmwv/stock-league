-- [2026-05-21] stocks 테이블에 market 컬럼 추가 및 기존 sector(KOSPI, KOSDAQ) 값을 이전합니다.
ALTER TABLE public.stocks ADD COLUMN IF NOT EXISTS market text;

-- 기존 sector 값 중 KOSPI, KOSDAQ에 해당되는 값을 market 컬럼에 저장합니다.
UPDATE public.stocks 
SET market = sector 
WHERE sector IN ('KOSPI', 'KOSDAQ');
