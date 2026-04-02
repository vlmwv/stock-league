-- 1. 예측(predictions) 테이블에 대한 UPDATE 정책 보강 (upsert를 위해 필수)
DROP POLICY IF EXISTS "Users can update their own predictions" ON public.predictions;
CREATE POLICY "Users can update their own predictions" ON public.predictions
  FOR UPDATE USING (auth.uid() = user_id);

-- 2. authenticated 역할에 명시적 권한 재부여 (만약 누락된 경우 대비)
GRANT ALL ON public.predictions TO authenticated;
GRANT USAGE ON SEQUENCE public.predictions_id_seq TO authenticated;

-- (참고) INSERT 정책은 이미 20260401000002_fix_wishlist_rls.sql에서 처리됨
