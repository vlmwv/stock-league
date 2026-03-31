-- rankings 테이블에 정답수(win_count) 컬럼 추가
ALTER TABLE public.rankings ADD COLUMN IF NOT EXISTS win_count INTEGER DEFAULT 0;

-- 기존 데이터가 있다면 계산해서 넣어주고 싶지만, 
-- win_rate와 prediction_count가 있으므로 대략적인 복구는 가능하지만 
-- 정확한 복구를 위해 Edge Function을 재실행하는 것을 권장합니다.
-- 여기서는 단순히 컬럼만 추가합니다.
