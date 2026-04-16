-- 1. profiles 테이블에 full_name 및 display_name_type 컬럼 추가
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name_type TEXT DEFAULT 'nickname' CHECK (display_name_type IN ('nickname', 'full_name'));

-- 2. handle_new_user 트리거 함수 업데이트: full_name 저장 로직 추가
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  resolved_gender TEXT;
  resolved_full_name TEXT;
  counter INTEGER := 0;
BEGIN
  -- 1) 이름 추출 (OAuth 메타데이터 기반)
  resolved_full_name := COALESCE(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name'
  );

  -- 2) 닉네임 기본값 결정 (기존 로직 유지)
  base_username := COALESCE(
    resolved_full_name,
    split_part(new.email, '@', 1),
    'user'
  );

  final_username := base_username;

  -- 3) 중복 체크 및 접미사 추가
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username AND id != new.id) AND counter < 10 LOOP
    counter := counter + 1;
    final_username := base_username || counter;
  END LOOP;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username AND id != new.id) THEN
    final_username := base_username || '_' || substr(md5(random()::text), 1, 4);
  END IF;

  -- 4) OAuth 메타데이터 성별 추출/정규화
  resolved_gender := COALESCE(
    public.normalize_gender(new.raw_user_meta_data->>'gender'),
    public.normalize_gender(new.raw_user_meta_data->>'gender_type'),
    public.normalize_gender(new.raw_user_meta_data->'kakao_account'->>'gender'),
    public.normalize_gender(new.raw_user_meta_data->'response'->>'gender')
  );

  -- 5) 프로필 생성/갱신 (full_name 추가)
  INSERT INTO public.profiles (id, username, full_name, email, avatar_url, gender, points, display_name_type)
  VALUES (
    new.id,
    final_username,
    resolved_full_name,
    new.email,
    new.raw_user_meta_data->>'avatar_url',
    resolved_gender,
    0,
    'nickname'
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    avatar_url = EXCLUDED.avatar_url,
    gender = COALESCE(public.profiles.gender, EXCLUDED.gender);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 기존 사용자 중 full_name이 없는 사용자 백필
-- Auth metadata에서 full_name 추출하여 적용
UPDATE public.profiles p
SET full_name = u_meta.full_name
FROM (
  SELECT
    id,
    COALESCE(
      raw_user_meta_data->>'full_name',
      raw_user_meta_data->>'name'
    ) AS full_name
  FROM auth.users
) u_meta
WHERE p.id = u_meta.id
  AND (p.full_name IS NULL OR p.full_name = '')
  AND u_meta.full_name IS NOT NULL;
