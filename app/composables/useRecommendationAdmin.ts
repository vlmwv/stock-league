// AI 추천(daily_stocks) 관리: 재평가 트리거, 추천 철회, 수동 추천 생성. (관리자/운영용)
export const useRecommendationAdmin = () => {
  const { client } = useStockClient()
  const { getKstDate } = useKstTime()

  const reEvaluateRecommendation = async (dailyId: number) => {
    try {
      const { data, error } = await client.functions.invoke('re-evaluate-recommendation', {
        body: { daily_stock_id: dailyId }
      })
      if (error) throw error
      return { success: true, data }
    } catch (err: any) {
      console.error('[useRecommendationAdmin] Re-evaluation failed:', err.message)
      return { success: false, message: err.message }
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
