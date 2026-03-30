-- stocks 테이블의 정렬 및 검색 성능을 향상시키기 위한 인덱스 추가

-- 1. 찜 많은 순 정렬용 인덱스
CREATE INDEX IF NOT EXISTS idx_stocks_wishlist_count ON public.stocks (wishlist_count DESC);

-- 2. 예측 성공 순 정렬용 인덱스
CREATE INDEX IF NOT EXISTS idx_stocks_win_count ON public.stocks (win_count DESC);

-- 3. 시가총액 순 정렬용 인덱스
CREATE INDEX IF NOT EXISTS idx_stocks_market_cap_rank ON public.stocks (market_cap_rank ASC);

-- 4. 종목명 및 코드 검색 성능 향상 (B-tree)
-- ilike 검색에는 pg_trgm이 더 좋지만, 기본 인덱스로도 어느 정도 성능 향상을 기대할 수 있습니다.
CREATE INDEX IF NOT EXISTS idx_stocks_name ON public.stocks (name);
CREATE INDEX IF NOT EXISTS idx_stocks_code ON public.stocks (code);
