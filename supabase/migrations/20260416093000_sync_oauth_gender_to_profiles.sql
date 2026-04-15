-- OAuth raw_user_meta_data의 성별 정보를 profiles.gender로 동기화합니다.
-- 신규 가입 트리거와 기존 사용자 백필을 함께 수행합니다.

CREATE OR REPLACE FUNCTION public.normalize_gender(raw TEXT)
RETURNS TEXT AS $$
DECLARE
  normalized TEXT;
BEGIN
  IF raw IS NULL THEN
    RETURN NULL;
  END IF;

  normalized := lower(trim(raw));

  IF normalized IN ('male', 'm', 'man', '남', '남자') THEN
    RETURN 'male';
  END IF;

  IF normalized IN ('female', 'f', 'woman', '여', '여자') THEN
    RETURN 'female';
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_name TEXT;
  resolved_gender TEXT;
BEGIN
  -- 1. 이름 추출 (full_name -> name -> email 앞부분 순)
  base_name := COALESCE(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );

  -- 2. OAuth 메타데이터 성별 추출/정규화
  resolved_gender := COALESCE(
    public.normalize_gender(new.raw_user_meta_data->>'gender'),
    public.normalize_gender(new.raw_user_meta_data->>'gender_type'),
    public.normalize_gender(new.raw_user_meta_data->'kakao_account'->>'gender'),
    public.normalize_gender(new.raw_user_meta_data->'response'->>'gender')
  );

  -- 3. 프로필 생성/갱신
  INSERT INTO public.profiles (id, username, email, avatar_url, gender, points)
  VALUES (
    new.id,
    base_name,
    new.email,
    new.raw_user_meta_data->>'avatar_url',
    resolved_gender,
    0
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    avatar_url = EXCLUDED.avatar_url,
    gender = COALESCE(public.profiles.gender, EXCLUDED.gender);

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- 실패 시 가입 플로우는 유지
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 기존 사용자 중 성별이 비어 있는 계정 백필
UPDATE public.profiles p
SET gender = g.gender
FROM (
  SELECT
    u.id,
    COALESCE(
      public.normalize_gender(u.raw_user_meta_data->>'gender'),
      public.normalize_gender(u.raw_user_meta_data->>'gender_type'),
      public.normalize_gender(u.raw_user_meta_data->'kakao_account'->>'gender'),
      public.normalize_gender(u.raw_user_meta_data->'response'->>'gender')
    ) AS gender
  FROM auth.users u
) g
WHERE p.id = g.id
  AND p.gender IS NULL
  AND g.gender IS NOT NULL;
