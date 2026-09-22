// AI 추천(daily_stocks) 관리: 재평가 트리거, 추천 철회, 수동 추천 생성. (관리자/운영용)
export const useRecommendationAdmin = () => {
  const { client } = useStockClient()
  const { getKstDate } = useKstTime()

  const reEvaluateRecommendation = async (dailyId: number) => {
    try {
      // Edge Function은 service_role 키로만 호출 가능하므로 관리자 전용 서버 라우트를 경유한다.
      const { data: sessionData } = await client.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('세션이 만료되었어요. 다시 로그인해 주세요.')

      const res = await $fetch<{ data: any }>('/api/admin/invoke-function', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: { name: 're-evaluate-recommendation', body: { daily_stock_id: dailyId } }
      })
      return { success: true, data: res.data }
    } catch (err: any) {
      const message = err?.data?.statusMessage || err?.statusMessage || err?.message
      console.error('[useRecommendationAdmin] Re-evaluation failed:', message)
      return { success: false, message }
    }
  }

  const withdrawRecommendation = async (dailyId: number) => {
    const { error } = await (client as any)
      .from('daily_stocks')
      .update({ status: 'withdrawn' })
      .eq('id', dailyId)

    if (error) {
      console.error('[useRecommendationAdmin] Withdrawal failed:', error.message)
      return { success: false, message: error.message }
    }
    return { success: true }
  }

  const createRecommendation = async (stockId: number, data: { ai_score: number, summary: string, reasoning: string, target_price: number, target_date: string, game_date?: string }) => {
    const targetDate = data.game_date || getKstDate()

    const { error } = await client
      .from('daily_stocks')
      .insert({
        stock_id: stockId,
        game_date: targetDate,
        llm_summary: data.summary,
        ai_score: data.ai_score,
        ai_reasoning: data.reasoning,
        target_price: data.target_price,
        target_date: data.target_date,
        status: 'pending'
      } as any)

    if (error) {
      console.error('[useRecommendationAdmin] Create recommendation failed:', error.message)
      return { success: false, message: error.message }
    }
    return { success: true }
  }

  return { reEvaluateRecommendation, withdrawRecommendation, createRecommendation }
}
