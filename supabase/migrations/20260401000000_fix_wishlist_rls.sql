-- 1. wishlists 테이블 user_id 기본값 설정 및 RLS 보강
ALTER TABLE public.wishlists ALTER COLUMN user_id SET DEFAULT auth.uid();

-- 2. predictions 테이블 user_id 기본값 설정 및 RLS 보강
ALTER TABLE public.predictions ALTER COLUMN user_id SET DEFAULT auth.uid();

-- 3. 권한 재부여 (authenticated 역할이 명시적으로 권한을 갖도록)
GRANT ALL ON public.wishlists TO authenticated;
GRANT ALL ON public.predictions TO authenticated;
GRANT USAGE ON SEQUENCE public.wishlists_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.predictions_id_seq TO authenticated;

-- 4. 찜하기 RLS 정책 재정의 (기존 정책 존재 시 덮어쓰기)
DROP POLICY IF EXISTS "Users can insert into their own wishlist" ON public.wishlists;
CREATE POLICY "Users can insert into their own wishlist" ON public.wishlists 
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can delete from their own wishlist" ON public.wishlists;
CREATE POLICY "Users can delete from their own wishlist" ON public.wishlists 
  FOR DELETE USING (auth.uid() = user_id);

-- 5. 예측 RLS 정책 재정의
DROP POLICY IF EXISTS "Users can insert their own predictions" ON public.predictions;
CREATE POLICY "Users can insert their own predictions" ON public.predictions
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
