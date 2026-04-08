-- [2026-04-08] 예측 내역 조회 정책 수정
-- 참여자 수를 글로벌하게 집계하기 위해 모든 사용자가 예측 내역의 ID와 날짜, 종목 등을 조회할 수 있도록 허용합니다.
-- 기존: 본인의 예측 내역만 조회 가능
-- 변경: 모든 사용자가 모든 예측 내역 조회 가능 (참여자 수 집계용)

DROP POLICY IF EXISTS "Users can view their own predictions" ON public.predictions;

CREATE POLICY "Predictions are viewable by everyone" ON public.predictions
  FOR SELECT USING (true);
