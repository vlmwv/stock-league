-- 1. wishlist_groups 테이블 생성
CREATE TABLE IF NOT EXISTS public.wishlist_groups (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'i-heroicons-folder',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS 설정
ALTER TABLE public.wishlist_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own groups" ON public.wishlist_groups;
CREATE POLICY "Users can view their own groups" ON public.wishlist_groups 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own groups" ON public.wishlist_groups;
CREATE POLICY "Users can insert their own groups" ON public.wishlist_groups 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own groups" ON public.wishlist_groups;
CREATE POLICY "Users can update their own groups" ON public.wishlist_groups 
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own groups" ON public.wishlist_groups;
CREATE POLICY "Users can delete their own groups" ON public.wishlist_groups 
  FOR DELETE USING (auth.uid() = user_id);

-- 2. wishlists 테이블 확장
ALTER TABLE public.wishlists ADD COLUMN IF NOT EXISTS group_id BIGINT REFERENCES public.wishlist_groups(id) ON DELETE CASCADE;

-- 3. 기존 사용자를 위한 기본 그룹 생성 및 마이그레이션
DO $$
DECLARE
    user_rec RECORD;
    new_group_id BIGINT;
BEGIN
    -- 기존 찜 데이터가 있는 사용자들에 대해 기본 폴더 생성
    FOR user_rec IN SELECT DISTINCT user_id FROM public.wishlists LOOP
        INSERT INTO public.wishlist_groups (user_id, name, sort_order)
        VALUES (user_rec.user_id, '기본 폴더', 0)
        RETURNING id INTO new_group_id;

        UPDATE public.wishlists
        SET group_id = new_group_id
        WHERE user_id = user_rec.user_id AND group_id IS NULL;
    END LOOP;
END $$;

-- 4. 제약 조건 강화
-- 기존 유니크 제약 조건 제거 (user_id, stock_id)
ALTER TABLE public.wishlists DROP CONSTRAINT IF EXISTS wishlists_user_id_stock_id_key;

-- 새로운 유니크 제약 조건 추가 (user_id, stock_id, group_id)
-- 만약 group_id가 NULL인 데이터가 남아있다면 에러가 날 수 있으므로 주의
ALTER TABLE public.wishlists ADD CONSTRAINT wishlists_user_id_stock_id_group_id_key UNIQUE(user_id, stock_id, group_id);

-- 5. 프로필 생성 시 기본 그룹 자동 생성 트리거
CREATE OR REPLACE FUNCTION public.handle_new_user_wishlist_group()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.wishlist_groups (user_id, name, sort_order)
  VALUES (NEW.id, '기본 폴더', 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created_wishlist_group ON public.profiles;
CREATE TRIGGER on_profile_created_wishlist_group
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_wishlist_group();
