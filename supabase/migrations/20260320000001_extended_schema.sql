-- 1. stocks 테이블 보완 (시가총액 순위 추가)
ALTER TABLE public.stocks ADD COLUMN IF NOT EXISTS market_cap_rank INTEGER;

-- 2. daily_stocks 테이블 보완 (LLM 요약 필드 추가)
ALTER TABLE public.daily_stocks ADD COLUMN IF NOT EXISTS llm_summary TEXT;

-- 3. news 테이블 생성 (뉴스 및 공시 정보)
CREATE TABLE IF NOT EXISTS public.news (
  id BIGSERIAL PRIMARY KEY,
  stock_id BIGINT REFERENCES public.stocks(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT,
  url TEXT,
  source TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  llm_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. wishlists 테이블 생성 (찜하기 기능)
CREATE TABLE IF NOT EXISTS public.wishlists (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  stock_id BIGINT REFERENCES public.stocks(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, stock_id)
);

-- 5. rankings 테이블 생성 (기간별 랭킹)
CREATE TABLE IF NOT EXISTS public.rankings (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  ranking_type TEXT NOT NULL, -- 'weekly', 'monthly', 'yearly', 'all_time'
  period_key TEXT NOT NULL, -- 예: '2024-W12', '2024-03'
  win_rate NUMERIC DEFAULT 0,
  prediction_count INTEGER DEFAULT 0,
  rank INTEGER NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, ranking_type, period_key)
);

-- 6. stock_price_history 테이블 생성 (시세 이력 관리)
CREATE TABLE IF NOT EXISTS public.stock_price_history (
  id BIGSERIAL PRIMARY KEY,
  stock_id BIGINT REFERENCES public.stocks(id) ON DELETE CASCADE NOT NULL,
  price_date DATE NOT NULL,
  close_price INTEGER NOT NULL,
  change_amount INTEGER,
  change_rate NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(stock_id, price_date)
);

-- RLS (Row Level Security) 설정
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_price_history ENABLE ROW LEVEL SECURITY;

-- 정책 설정
-- 뉴스: 모든 사용자가 조회 가능
DROP POLICY IF EXISTS "News are viewable by everyone" ON public.news;
CREATE POLICY "News are viewable by everyone" ON public.news FOR SELECT USING (true);

-- 찜하기: 본인의 데이터만 조회/추가/삭제 가능
DROP POLICY IF EXISTS "Users can view their own wishlist" ON public.wishlists;
CREATE POLICY "Users can view their own wishlist" ON public.wishlists 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert into their own wishlist" ON public.wishlists;
CREATE POLICY "Users can insert into their own wishlist" ON public.wishlists 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete from their own wishlist" ON public.wishlists;
CREATE POLICY "Users can delete from their own wishlist" ON public.wishlists 
  FOR DELETE USING (auth.uid() = user_id);

-- 랭킹: 모든 사용자가 조회 가능
DROP POLICY IF EXISTS "Rankings are viewable by everyone" ON public.rankings;
CREATE POLICY "Rankings are viewable by everyone" ON public.rankings FOR SELECT USING (true);

-- 시세 이력: 모든 사용자가 조회 가능
DROP POLICY IF EXISTS "Stock price history is viewable by everyone" ON public.stock_price_history;
CREATE POLICY "Stock price history is viewable by everyone" ON public.stock_price_history FOR SELECT USING (true);
