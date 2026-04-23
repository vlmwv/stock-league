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

-- 3. 기존 사용자를 위한 마이그레이션 (필요 시)
-- (기본 폴더 생성 로직 제거됨)

-- 4. 제약 조건 강화
-- 기존 유니크 제약 조건 제거 (user_id, stock_id)
ALTER TABLE public.wishlists DROP CONSTRAINT IF EXISTS wishlists_user_id_stock_id_key;

-- 새로운 유니크 제약 조건 추가 (user_id, stock_id, group_id)
-- 만약 group_id가 NULL인 데이터가 남아있다면 에러가 날 수 있으므로 주의
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wishlists_user_id_stock_id_group_id_key') THEN
        ALTER TABLE public.wishlists ADD CONSTRAINT wishlists_user_id_stock_id_group_id_key UNIQUE(user_id, stock_id, group_id);
    END IF;
END $$;

-- 5. 프로필 생성 시 자동 처리 (기본 폴더 생성 로직 제거됨)
