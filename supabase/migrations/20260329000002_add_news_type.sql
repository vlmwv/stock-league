-- 2026/03/29 개별 종목 뉴스 타입 추가 (news, notice, ir)
ALTER TABLE news ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'news' CHECK (type IN ('news', 'notice', 'ir'));

COMMENT ON COLUMN news.type IS '정보 타입: news(뉴스), notice(공시), ir(IR)';
