-- Create scenario_attempts table
CREATE TABLE IF NOT EXISTS public.scenario_attempts (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    scenario_id INT NOT NULL, -- 기존 scenarios 테이블이 있다면 REFERENCES public.scenarios(id) ON DELETE CASCADE 적용 가능
    score NUMERIC(5, 2) NOT NULL, -- 최종 정답률 (예: 76.67%)
    correct_count INT NOT NULL, -- 맞춘 일수 (0~30)
    total_days INT NOT NULL DEFAULT 30, -- 총 진행 일수 (30)
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_user_scenario UNIQUE (user_id, scenario_id) -- 시나리오당 1회 도전 제한의 핵심 조건
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.scenario_attempts ENABLE ROW LEVEL SECURITY;

-- Create policies for scenario_attempts
-- 1. Anyone can view rankings (select)
CREATE POLICY "Allow public select for scenario rankings" 
ON public.scenario_attempts 
FOR SELECT 
USING (true);

-- 2. Authenticated users can insert their own attempts
CREATE POLICY "Allow authenticated users to insert their own scenario attempts" 
ON public.scenario_attempts 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_scenario_attempts_scenario_id_score ON public.scenario_attempts (scenario_id, score DESC, completed_at ASC);
