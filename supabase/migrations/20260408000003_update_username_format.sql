-- 닉네임 형식을 '이름(이메일)'으로 자동 설정하는 트리거 수정
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_name TEXT;
  user_email TEXT;
  final_username TEXT;
BEGIN
  -- 1. 이름 추출 (full_name -> name 순)
  base_name := COALESCE(
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'name', 
    split_part(new.email, '@', 1)
  );
  
  -- 2. 이메일 추출
  user_email := new.email;

  -- 3. '이름(이메일)' 형식으로 닉네임 생성
  final_username := base_name || '(' || user_email || ')';

  -- 4. 프로필 생성 (고유 닉네임이므로 충돌 가능성 매우 낮음)
  INSERT INTO public.profiles (id, username, avatar_url, points)
  VALUES (
    new.id, 
    final_username, 
    new.raw_user_meta_data->>'avatar_url',
    0
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    avatar_url = EXCLUDED.avatar_url;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- 실패 시 로그만 남기고 가입은 허용 (최후의 보루)
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 재등록
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
