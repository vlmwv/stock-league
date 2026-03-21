import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const today = new Date().toISOString().split('T')[0] as string

  // 오늘의 활성화된 게임 종목 5개를 가져옵니다.
  const { data, error } = await (client as any)
    .from('daily_stocks')
    .select(`
      id,
      game_date,
      llm_summary,
      status,
      stocks (
        id,
        code,
        name,
        sector,
        last_price,
        change_amount,
        change_rate
      )
    `)
    .eq('game_date', today)
    .order('id', { ascending: true })

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message,
    })
  }

  return data
})
