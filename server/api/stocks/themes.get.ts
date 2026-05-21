import { serverSupabaseClient } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient(event)

  // stocks 테이블에서 전체 종목 데이터를 가져옵니다.
  const { data: stocks, error } = await client
    .from('stocks')
    .select('id, name, code, sector, last_price, change_amount, change_rate, market_cap_rank')

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message,
    })
  }

  if (!stocks || stocks.length === 0) {
    return []
  }

  // sector(테마/업종) 별로 그룹핑을 수행합니다.
  const themesMap = new Map<string, {
    sector: string
    stock_count: number
    avg_change_rate: number
    stocks: any[]
  }>()

  for (const stock of stocks) {
    const sector = stock.sector?.trim()
    if (!sector) continue // 섹터 정보가 없는 종목은 테마 집계에서 제외합니다.

    if (!themesMap.has(sector)) {
      themesMap.set(sector, {
        sector,
        stock_count: 0,
        avg_change_rate: 0,
        stocks: []
      })
    }

    const theme = themesMap.get(sector)!
    theme.stock_count++
    theme.stocks.push({
      id: stock.id,
      name: stock.name,
      code: stock.code,
      last_price: stock.last_price || 0,
      change_amount: stock.change_amount || 0,
      change_rate: stock.change_rate || 0,
      market_cap_rank: stock.market_cap_rank ?? 99999
    })
  }

  const themesList = Array.from(themesMap.values())

  // 각 테마별 평균 등락률을 계산하고 소속 주식들을 등락률 높은 순으로 정렬합니다.
  for (const theme of themesList) {
    const totalChangeRate = theme.stocks.reduce((sum, s) => sum + (s.change_rate || 0), 0)
    theme.avg_change_rate = Number((totalChangeRate / theme.stock_count).toFixed(2))
    
    // 테마 내부 종목들을 시가총액 순위(market_cap_rank) 오름차순으로 정렬합니다.
    theme.stocks.sort((a, b) => (a.market_cap_rank ?? 99999) - (b.market_cap_rank ?? 99999))
  }

  // 테마 전체를 평균 등락률이 높은 순(내림차순)으로 정렬하여 상위 8개만 추려냅니다.
  themesList.sort((a, b) => b.avg_change_rate - a.avg_change_rate)

  return themesList.slice(0, 8)
})
