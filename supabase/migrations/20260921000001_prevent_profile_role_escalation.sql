-- [2026-09-21] 프로필 권한 자가 상승 차단
-- profiles의 UPDATE 정책(USING/WITH CHECK auth.uid() = id)에 컬럼 제한이 없어
-- 사용자가 본인 행의 role을 'admin'으로 바꿀 수 있었다.
-- profiles.role은 batch_execution_logs RLS(20260401000001)의 판정 기준이므로
-- 자가 승격 시 배치 로그 열람·삭제 권한을 얻는다.
-- 컬럼 단위 GRANT는 profiles에 컬럼이 계속 추가돼 관리가 어려우므로 트리거로 막는다.
-- role 변경은 service_role(서버/배치) 또는 DB 관리자만 가능하다.
CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- PostgREST는 anon/authenticated 역할로 SET ROLE 후 쿼리하므로 이 둘만 차단하면 된다.
  -- (service_role 키 요청은 current_user = 'service_role', 마이그레이션은 'postgres')
  IF NEW.role IS DISTINCT FROM OLD.role AND current_user IN ('anon', 'authenticated') THEN
    RAISE EXCEPTION '권한(role)은 직접 변경할 수 없습니다.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_role_escalation ON public.profiles;
CREATE TRIGGER prevent_profile_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_role_escalation();
