-- 시나리오 미니게임 데이터 (과거 app/composables/useScenario.ts 하드코딩 → DB 이관).
-- 캔들/이벤트는 시나리오 단위로 통째 로드되므로 정규화 대신 jsonb로 저장한다.
-- 공개 게임 콘텐츠이므로 public select를 허용한다(쓰기는 service role/seed 스크립트만).
-- 시드: scripts/seed_scenarios.ts (절차적 생성기로 캔들을 구워 upsert).
CREATE TABLE IF NOT EXISTS public.scenarios (
    id          INT PRIMARY KEY,                     -- 기존 하드코딩 id(1~10) 유지 → scenario_attempts.scenario_id와 정합
    title       TEXT NOT NULL,
    subtitle    TEXT NOT NULL,
    difficulty  TEXT NOT NULL,                        -- 어려움 | 보통 | 쉬움
    type        TEXT NOT NULL,                        -- 역사 | 가상
    index_name  TEXT NOT NULL,                        -- S&P 500 | KOSPI | NASDAQ
    etf_name    TEXT NOT NULL,                        -- SPY | KODEX 200 | QQQ | SOXX
    start_date  TEXT NOT NULL,
    end_date    TEXT NOT NULL,
    description TEXT NOT NULL,
    candles     JSONB NOT NULL DEFAULT '[]'::jsonb,   -- CandleData[] (date/open/high/low/close/volume)
    events      JSONB NOT NULL DEFAULT '[]'::jsonb,   -- ScenarioEvent[] (day/title/description/importance)
    sort_order  INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read for scenarios"
ON public.scenarios
FOR SELECT
USING (true);

-- 참고: 시드 완료 후(scenarios에 1~10 존재) 무결성을 강화하려면 아래 FK를 별도 마이그레이션으로 추가할 수 있다.
--   ALTER TABLE public.scenario_attempts
--     ADD CONSTRAINT fk_scenario_attempts_scenario
--     FOREIGN KEY (scenario_id) REFERENCES public.scenarios(id) ON DELETE CASCADE;
-- (빈 테이블 상태에서 기존 attempts가 있으면 실패하므로 이 마이그레이션에는 포함하지 않는다.)
