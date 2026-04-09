-- AI 분석 로그 테이블 생성
CREATE TABLE IF NOT EXISTS public.ai_analysis_logs (
    id BIGSERIAL PRIMARY KEY,
    stock_code TEXT,
    stock_name TEXT,
    prompt TEXT,
    response_raw JSONB,
    ai_score INTEGER,
    game_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 추가 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_ai_analysis_logs_game_date ON public.ai_analysis_logs(game_date);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_logs_stock_code ON public.ai_analysis_logs(stock_code);

-- RLS 설정 (필요한 경우)
ALTER TABLE public.ai_analysis_logs ENABLE ROW LEVEL SECURITY;

-- 관리자만 조회 가능하도록 정책 설정 (기본적으로는 서비스 역할만 접근 가능하게 둠)
CREATE POLICY "Admins can view AI logs" ON public.ai_analysis_logs
    FOR SELECT USING (auth.role() = 'service_role');
