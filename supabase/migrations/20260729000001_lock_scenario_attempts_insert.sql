-- [2026-07-29] 시나리오 점수 위조 차단
-- 기존에는 authenticated 클라이언트가 scenario_attempts에 correct_count/score를 직접 insert할 수 있어
-- 브라우저에서 임의 만점 기록을 주입해 리더보드를 조작할 수 있었다.
-- 클라이언트 INSERT 정책을 제거하고, 점수를 서버에서 재계산해 저장하는
-- 서버 API(/api/scenarios/attempt, service_role)만 삽입하도록 강제한다.
-- SELECT(공개 랭킹 조회) 정책은 그대로 유지한다.
DROP POLICY IF EXISTS "Allow authenticated users to insert their own scenario attempts"
  ON public.scenario_attempts;
