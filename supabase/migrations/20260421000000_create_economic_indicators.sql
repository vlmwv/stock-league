-- Create economic_indicators table
CREATE TABLE IF NOT EXISTS public.economic_indicators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name TEXT NOT NULL,
    event_at TIMESTAMPTZ NOT NULL,
    country TEXT NOT NULL, -- 'US', 'KR'
    importance INTEGER DEFAULT 1, -- 1: Low, 2: Medium, 3: High
    actual TEXT,
    forecast TEXT,
    previous TEXT,
    unit TEXT,
    impact TEXT, -- 'positive', 'negative', 'neutral'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint to prevent duplicates (event_name + event_at)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'economic_indicators_name_date_unique') THEN
        ALTER TABLE public.economic_indicators 
        ADD CONSTRAINT economic_indicators_name_date_unique UNIQUE (event_name, event_at);
    END IF;
END $$;

-- RLS Policies
ALTER TABLE public.economic_indicators ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'economic_indicators' 
        AND policyname = 'Allow public read access to economic_indicators'
    ) THEN
        CREATE POLICY "Allow public read access to economic_indicators" 
        ON public.economic_indicators FOR SELECT USING (true);
    END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_economic_indicators_event_at ON public.economic_indicators(event_at DESC);
CREATE INDEX IF NOT EXISTS idx_economic_indicators_country ON public.economic_indicators(country);
