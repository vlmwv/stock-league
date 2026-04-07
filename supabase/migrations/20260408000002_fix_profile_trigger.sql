-- 닉네임 중복 충돌을 방지하기 위한 트리거 함수 개선
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INTEGER := 0;
BEGIN
  -- 1. 기본 닉네임 추출 (full_name -> name -> email ID 순)
  base_username := COALESCE(
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'name', 
    split_part(new.email, '@', 1),
    'user'
  );
  
  final_username := base_username;

  -- 2. 중복 체크 및 접미사 추가 (최대 10회 루프)
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) AND counter < 10 LOOP
    counter := counter + 1;
    final_username := base_username || counter;
  END LOOP;

  -- 3. 여전히 중복이면 랜덤 문자열 추가하여 강제 고유화
  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) THEN
    final_username := base_username || '_' || substr(md5(random()::text), 1, 4);
  END IF;

  -- 4. 프로필 생성
  INSERT INTO public.profiles (id, username, avatar_url, points)
  VALUES (
    new.id, 
    final_username, 
    new.raw_user_meta_data->>'avatar_url',
    0
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- 실패하더라도 인증 자체는 성공할 수 있도록 예외 처리 (최후의 보루)
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 재등록 (만약 없을 경우를 대비)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
