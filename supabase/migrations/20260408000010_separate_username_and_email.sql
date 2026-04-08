-- 1. profiles 테이블에서 username UNIQUE 제약 조건 제거
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_key;

-- 2. profiles 테이블에 email 컬럼 추가 (관리용 고유 키)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 3. 기존 사용자의 이메일 정보를 auth.users에서 가져와서 업데이트
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id;

-- 4. email 컬럼에 UNIQUE 제약 조건 추가
ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);

-- 5. 기존 username에서 '(이메일)' 부분 제거
-- 예: '홍길동(hong@gmail.com)' -> '홍길동'
UPDATE public.profiles
SET username = regexp_replace(username, '\(.*\)$', '')
WHERE username LIKE '%(%)%';

-- 6. handle_new_user 트리거 함수 수정
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_name TEXT;
BEGIN
  -- 1. 이름 추출 (full_name -> name -> email 앞부분 순)
  base_name := COALESCE(
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'name', 
    split_part(new.email, '@', 1)
  );
  
  -- 2. 프로필 생성 (username은 중복 가능, email은 고유 키로 저장)
  INSERT INTO public.profiles (id, username, email, avatar_url, points)
  VALUES (
    new.id, 
    base_name, 
    new.email,
    new.raw_user_meta_data->>'avatar_url',
    0
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    avatar_url = EXCLUDED.avatar_url;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- 실패 시 로그만 남기고 가입은 허용 (최후의 보루)
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
