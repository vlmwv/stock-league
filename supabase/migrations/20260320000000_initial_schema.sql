-- 1. Profiles table (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  avatar_url TEXT,
  points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Stocks table (KRX Top 100 stocks)
CREATE TABLE IF NOT EXISTS public.stocks (
  id BIGSERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  sector TEXT,
  summary TEXT,
  last_price INTEGER,
  change_amount INTEGER,
  change_rate NUMERIC,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Daily Stocks table (Selected 5 stocks for each day)
CREATE TABLE IF NOT EXISTS public.daily_stocks (
  id BIGSERIAL PRIMARY KEY,
  stock_id BIGINT REFERENCES public.stocks(id) ON DELETE CASCADE NOT NULL,
  game_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'pending', -- 'pending', 'closing', 'closed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(stock_id, game_date)
);

-- 4. Predictions table (User predictions)
CREATE TABLE IF NOT EXISTS public.predictions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  stock_id BIGINT REFERENCES public.stocks(id) ON DELETE CASCADE NOT NULL,
  game_date DATE NOT NULL DEFAULT CURRENT_DATE,
  prediction_type TEXT NOT NULL, -- 'up', 'down'
  result TEXT DEFAULT 'pending', -- 'pending', 'win', 'lose', 'draw'
  points_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, stock_id, game_date)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Stocks are viewable by everyone" ON public.stocks;
CREATE POLICY "Stocks are viewable by everyone" ON public.stocks
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Daily stocks are viewable by everyone" ON public.daily_stocks;
CREATE POLICY "Daily stocks are viewable by everyone" ON public.daily_stocks
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can view their own predictions" ON public.predictions;
CREATE POLICY "Users can view their own predictions" ON public.predictions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own predictions" ON public.predictions;
CREATE POLICY "Users can insert their own predictions" ON public.predictions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
