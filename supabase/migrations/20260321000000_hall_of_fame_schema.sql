-- 명예의 전당 테이블 (월간, 연간 리그 상위 기록 보관용)
CREATE TABLE IF NOT EXISTS public.hall_of_fame (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  period_type TEXT NOT NULL, -- 'monthly', 'yearly'
  period_key TEXT NOT NULL,  -- 예: '2024-03', '2024'
  rank INTEGER NOT NULL,     -- 1, 2, 3 등 최종 순위
  win_rate NUMERIC DEFAULT 0,
  prediction_count INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, period_type, period_key)
);

-- RLS 설정
ALTER TABLE public.hall_of_fame ENABLE ROW LEVEL SECURITY;

-- 정책: 누구나 조회 가능
DROP POLICY IF EXISTS "Hall of fame is viewable by everyone" ON public.hall_of_fame;
CREATE POLICY "Hall of fame is viewable by everyone" ON public.hall_of_fame FOR SELECT USING (true);
