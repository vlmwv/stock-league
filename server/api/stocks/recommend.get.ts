import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)

  // 최신 뉴스와 LLM 요약이 포함된 종목들을 추천 종목으로 반환합니다.
  const { data, error } = await (client as any)
    .from('news')
    .select(`
      id,
      title,
      llm_summary,
      published_at,
      stocks (
        id,
        code,
        name,
        last_price,
        change_amount,
        change_rate
      )
    `)
    .order('published_at', { ascending: false })
    .limit(10)

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message,
    })
  }

  // 중복된 종목 제거 (한 종목에 뉴스가 여러 개일 수 있음)
  const uniqueStocks = Array.from(new Map((data as any[]).map(item => [item.stocks.id, item])).values())

  return uniqueStocks
})
