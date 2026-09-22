-- [2026-09-21] 예측 위조 차단
-- 기존에는 authenticated 클라이언트가 predictions에 직접 insert/update할 수 있어
-- 브라우저에서 result='win'을 주입하거나 마감 후 prediction_type을 바꿔 랭킹을 조작할 수 있었다.
-- (calculate-rankings가 result='win' 건수를 그대로 집계한다.)
-- 클라이언트 쓰기 정책·권한을 제거하고, 마감시각·리그 종목을 서버에서 검증해 저장하는
-- 서버 API(/api/predictions/submit, service_role)만 삽입·수정하도록 강제한다.
-- SELECT(본인 예측 조회) 정책은 그대로 유지한다.
DROP POLICY IF EXISTS "Users can insert their own predictions" ON public.predictions;
DROP POLICY IF EXISTS "Users can update their own predictions" ON public.predictions;

-- 과거 마이그레이션에서 부여한 GRANT ALL을 회수한다(RLS와 별개의 방어선).
REVOKE INSERT, UPDATE, DELETE ON public.predictions FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.predictions FROM anon;
REVOKE USAGE ON SEQUENCE public.predictions_id_seq FROM authenticated;
REVOKE USAGE ON SEQUENCE public.predictions_id_seq FROM anon;

-- 조회 권한은 유지(RLS 정책이 본인 행으로 제한).
GRANT SELECT ON public.predictions TO authenticated;
