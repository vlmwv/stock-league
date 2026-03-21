-- Seed stocks data
INSERT INTO public.stocks (code, name, sector, summary, last_price, change_amount, change_rate, market_cap_rank)
VALUES 
  ('005930', '삼성전자', '반도체', '반도체 업황 회복 기대감 지속', 72500, 1200, 1.68, 1),
  ('000660', 'SK하이닉스', '반도체', 'HBM 공급 확대 및 실적 개선 전망', 142000, -500, -0.35, 2),
  ('373220', 'LG에너지솔루션', '2차전지', '글로벌 전기차 수요 둔화 우려', 385000, 0, 0.0, 3),
  ('035420', 'NAVER', 'IT서비스', 'AI 서비스 고도화 및 수익성 개선', 198000, 4500, 2.33, 8),
  ('035720', '카카오', 'IT서비스', '경영 쇄신 및 핵심 사업 집중', 48000, -200, -0.42, 14)
ON CONFLICT (code) DO UPDATE SET
  last_price = EXCLUDED.last_price,
  change_amount = EXCLUDED.change_amount,
  change_rate = EXCLUDED.change_rate,
  summary = EXCLUDED.summary,
  market_cap_rank = EXCLUDED.market_cap_rank,
  updated_at = now();

-- Select these as daily stocks for today
INSERT INTO public.daily_stocks (stock_id, game_date, llm_summary)
SELECT id, CURRENT_DATE, '반도체 업황 회복 및 AI 반도체 수요 급증으로 인한 상승세가 기대됩니다.' 
FROM public.stocks 
WHERE code IN ('005930', '000660')
ON CONFLICT (stock_id, game_date) DO UPDATE SET
  llm_summary = EXCLUDED.llm_summary;

-- Seed sample news
INSERT INTO public.news (stock_id, title, content, url, source, llm_summary, published_at)
SELECT id, '삼성전자, 반도체 부문 실적 반등 성공', '삼성전자가 1분기 영업이익이 가이던스를 상회하며 반도체 부문의 뚜렷한 실적 개선을 보여주었습니다.', 'https://example.com/news/1', '경제뉴스', '반도체 업황 개선이 가속화되고 있으며, 메모리 가격 상승에 따른 수익성 확대가 예상됨.', now()
FROM public.stocks WHERE code = '005930'
LIMIT 1;
