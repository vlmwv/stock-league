-- news 테이블에 upsert가 가능하도록 stock_id와 title 조합에 대한 고유 제약 조건 추가
ALTER TABLE public.news 
ADD CONSTRAINT news_stock_id_title_key UNIQUE (stock_id, title);

-- (선택 사항) URL이 있는 경우 URL에 대해서도 고유성을 보장하고 싶다면 아래 주석 해제
-- ALTER TABLE public.news ADD CONSTRAINT news_url_key UNIQUE (url);
