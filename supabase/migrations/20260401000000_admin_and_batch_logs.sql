-- 1. Profiles 테이블에 role 컬럼 추가
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- 2. 배치 실행 로그 테이블 생성
CREATE TABLE IF NOT EXISTS public.batch_execution_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  function_name TEXT NOT NULL,
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'fail')),
  processed_count INTEGER DEFAULT 0,
  message TEXT,
  error_detail JSONB,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  finished_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. RLS 설정
ALTER TABLE public.batch_execution_logs ENABLE ROW LEVEL SECURITY;

-- 관리자만 로그를 볼 수 있도록 설정
CREATE POLICY "Admins can view batch logs" ON public.batch_execution_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 관리자만 로그를 삭제할 수 있도록 설정 (필요시)
CREATE POLICY "Admins can delete batch logs" ON public.batch_execution_logs
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 배치 함수(service_role)는 로그를 삽입할 수 있어야 함
CREATE POLICY "Service role can insert batch logs" ON public.batch_execution_logs
  FOR INSERT WITH CHECK (true); 
