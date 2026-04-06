-- 1. Profiles 테이블 RLS 정책 강화
-- "WITH CHECK" 절을 추가하여 본인 기록만 수정할 수 있도록 로직을 더 견고하게 만듭니다.

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 2. (선택사항) 닉네임 중복 체크를 위한 인덱스 확인 (이미 UNIQUE 제약조건이 있으나 명시적으로 확인)
-- 만약 UNIQUE 제약조건이 없다면 추가하는 구문 (이미 20260320000000_initial_schema.sql에 포함됨)
-- ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_key UNIQUE (username);
