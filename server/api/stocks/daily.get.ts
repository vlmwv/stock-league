import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)
  const today = new Date().toISOString().split('T')[0] as string

  // 1. 오늘 혹은 그 이후의 가장 가까쁜 활성화된 게임 날짜를 먼저 찾습니다.
  const { data: dateData } = await (client as any)
    .from('daily_stocks')
    .select('game_date')
    .gte('game_date', today)
    .order('game_date', { ascending: true })
    .limit(1)

  const targetDate = (dateData as any)?.[0]?.game_date || today

  // 2. 해당 날짜의 활성화된 게임 종목 5개를 가져옵니다.
  const { data, error } = await (client as any)
    .from('daily_stocks')
    .select(`
      id,
      game_date,
      llm_summary,
      status,
      stocks (
        id,
        name,
        code,
        sector,
        last_price,
        change_amount,
        change_rate
      )
    `)
    .eq('game_date', targetDate)
    .order('id', { ascending: true })

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message,
    })
  }

  return data
})
