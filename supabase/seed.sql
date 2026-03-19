-- Seed stocks data
INSERT INTO public.stocks (code, name, sector, summary, last_price, change_amount, change_rate)
VALUES 
  ('005930', '삼성전자', '반도체', '반도체 업황 회복 기대감 지속', 72500, 1200, 1.68),
  ('000660', 'SK하이닉스', '반도체', 'HBM 공급 확대 및 실적 개선 전망', 142000, -500, -0.35),
  ('373220', 'LG에너지솔루션', '2차전지', '글로벌 전기차 수요 둔화 우려', 385000, 0, 0.0),
  ('035420', 'NAVER', 'IT서비스', 'AI 서비스 고도화 및 수익성 개선', 198000, 4500, 2.33),
  ('035720', '카카오', 'IT서비스', '경영 쇄신 및 핵심 사업 집중', 48000, -200, -0.42)
ON CONFLICT (code) DO UPDATE SET
  last_price = EXCLUDED.last_price,
  change_amount = EXCLUDED.change_amount,
  change_rate = EXCLUDED.change_rate,
  summary = EXCLUDED.summary,
  updated_at = now();

-- Select these as daily stocks for today
INSERT INTO public.daily_stocks (stock_id, game_date)
SELECT id, CURRENT_DATE FROM public.stocks
ON CONFLICT (stock_id, game_date) DO NOTHING;
