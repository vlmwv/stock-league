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
  const submitScenarioAttempt = async (scenarioId: number, correctCount: number, totalDays: number) => {
    const currentUser = await resolveUser()
    if (!currentUser?.id) {
      return { success: false, message: '로그인이 필요합니다.' }
    }
    const playDays = totalDays > 7 ? totalDays - 7 : totalDays
    const score = Math.round((correctCount / playDays) * 10000) / 100

    try {
      // 중복 도전 검사
      const { data: existing, error: existError } = await supabase
        .from('scenario_attempts')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('scenario_id', scenarioId)
        .maybeSingle()

      if (existError) throw existError
      if (existing) {
        return { success: false, message: '이미 도전이 완료된 시나리오입니다.' }
      }

      // 점수 저장
      const { data, error } = await (supabase as any)
        .from('scenario_attempts')
        .insert({
          user_id: currentUser.id,
          scenario_id: scenarioId,
          correct_count: correctCount,
          score: score,
          total_days: totalDays
        })
        .select()
        .single()

      if (error) throw error
      return { success: true, data }
    } catch (err: any) {
      console.error('[useScenario] submitScenarioAttempt error:', err)
      return { success: false, message: err.message || '기록 저장 중 오류가 발생했습니다.' }
    }
  }

  return {
    scenarios,
    fetchUserAttempts,
    fetchScenarioRankings,
    submitScenarioAttempt
  }
}
