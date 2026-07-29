export interface CandleData {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface ScenarioEvent {
  day: number
  title: string
  description: string
  importance: 'high' | 'medium' | 'low'
}

export interface Scenario {
  id: number
  title: string
  subtitle: string
  difficulty: '어려움' | '보통' | '쉬움'
  type: '역사' | '가상'
  indexName: 'S&P 500' | 'KOSPI' | 'NASDAQ'
  etfName: 'SPY' | 'KODEX 200' | 'QQQ' | 'SOXX'
  startDate: string
  endDate: string
  description: string
  candles: CandleData[]
  events: ScenarioEvent[]
}

export const useScenario = () => {
  const supabase = useSupabaseClient()
  const { resolveUser } = useStockClient()

  // 1. 시나리오 목록 — DB(public.scenarios)에서 조회한다(과거 하드코딩 → 이관, scripts/seed_scenarios.ts로 시드).
  // useAsyncData로 SSR에서 미리 로드해 컴포넌트 마운트 시점에 scenarios.value가 채워져 있도록 한다.
  const { data: scenarios } = useAsyncData<Scenario[]>('scenarios', async () => {
    // scenarios 테이블은 아직 생성 타입(supabase/types.ts) 미반영 → 기존 관례대로 (supabase as any) 캐스팅.
    const { data, error } = await (supabase as any)
      .from('scenarios')
      .select('id, title, subtitle, difficulty, type, index_name, etf_name, start_date, end_date, description, candles, events')
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('[useScenario] Failed to fetch scenarios:', error.message)
      return []
    }

    return ((data as any[]) || []).map((r): Scenario => ({
      id: r.id,
      title: r.title,
      subtitle: r.subtitle,
      difficulty: r.difficulty,
      type: r.type,
      indexName: r.index_name,
      etfName: r.etf_name,
      startDate: r.start_date,
      endDate: r.end_date,
      description: r.description,
      candles: r.candles || [],
      events: r.events || []
    }))
  }, { default: () => [] })

  // 2. 로그인 유저의 시나리오 도전 내역 리스트 가져오기
  const fetchUserAttempts = async () => {
    const currentUser = await resolveUser()
    if (!currentUser?.id) return []

    try {
      const { data, error } = await supabase
        .from('scenario_attempts')
        .select('scenario_id, score, correct_count, total_days, completed_at')
        .eq('user_id', currentUser.id)

      if (error) {
        console.error('[useScenario] fetchUserAttempts DB Error:', error.message)
        return []
      }
      return data || []
    } catch (err) {
      console.error('[useScenario] fetchUserAttempts error:', err)
      return []
    }
  }

  // 3. 특정 시나리오의 랭킹 리스트 가져오기
  const fetchScenarioRankings = async (scenarioId: number) => {
    try {
      // 랭킹은 scenario_attempts와 profiles를 조합해서 랭킹 형태로 직접 서버 API나 클라이언트 쿼리로 가져옴
      const data = await $fetch('/api/scenarios/rankings', {
        query: { scenarioId }
      })
      return data as any[]
    } catch (err) {
      console.error('[useScenario] fetchScenarioRankings error:', err)
      return []
    }
  }

  // 4. 게임 최종 완료 기록 저장하기
  // 점수 위조 방지를 위해 클라이언트는 점수를 계산하지 않고 예측 배열만 서버로 보낸다.
  // 서버(/api/scenarios/attempt)가 시나리오 캔들로 정답을 재계산해 저장한다.
  const submitScenarioAttempt = async (scenarioId: number, predictions: ('up' | 'down')[]) => {
    const currentUser = await resolveUser()
    if (!currentUser?.id) {
      return { success: false, message: '로그인이 필요합니다.' }
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) {
        return { success: false, message: '로그인이 필요합니다.' }
      }

      const data = await $fetch('/api/scenarios/attempt', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: { scenarioId, predictions }
      })
      return { success: true, data }
    } catch (err: any) {
      const message = err?.data?.statusMessage || err?.statusMessage || err?.message || '기록 저장 중 오류가 발생했습니다.'
      console.error('[useScenario] submitScenarioAttempt error:', message)
      return { success: false, message }
    }
  }

  return {
    scenarios,
    fetchUserAttempts,
    fetchScenarioRankings,
    submitScenarioAttempt
  }
}
