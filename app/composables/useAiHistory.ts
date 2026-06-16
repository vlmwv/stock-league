import { decodeHtmlEntities } from '~/utils/stock'
import { loadRecPriceHistory, resolveRecPrice } from '~/utils/stockHistory'

// AI 추천 이력 조회. 추천 기준가(rec_price) 기반 누적 수익률을 계산한다.
// 페이지 단위(fetchAiHistory)와 월 단위 캘린더(fetchAiHistoryMonthly)를 제공한다.
export const useAiHistory = () => {
  const { client } = useStockClient()
  const { getKstDate } = useKstTime()

  const fetchAiHistory = async (page = 1, pageSize = 20, stockId?: number) => {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = client
      .from('daily_stocks')
      .select(`
        id,
        game_date,
        created_at,
        llm_summary,
        ai_score,
        ai_result,
        target_price,
        target_date,
        stocks (
          id,
          name,
          code,
          last_price,
          change_amount,
          change_rate
        )
      `)

    if (stockId) {
      query = query.eq('stock_id', stockId)
    }

    const { data, error } = await query
      .order('game_date', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('Error fetching AI history:', error)
      return { items: [], emptyReason: 'error' as const }
    }

    // 추천 당시의 기준 가격(추천 전일 종가)을 가져오기 위해 stock_price_history 조회
    const stockIds = (data || []).map((ds: any) => ds.stocks?.id).filter(Boolean)
    const gameDates = (data || []).map((ds: any) => ds.game_date).filter(Boolean)

    const historyPrices = await loadRecPriceHistory(client, stockIds, gameDates)

    const todayStr = getKstDate()
    const todayNum = new Date(todayStr).getTime()

    const items = (data || [])
      .filter((ds: any) => ds.stocks)
      .map((ds: any) => {
        // 추천 기준가(rec_price) 결정. game_date 이전(없으면 당일) 종가이며, 시세가 없으면 제외
        const recPrice = resolveRecPrice(historyPrices, ds.stocks.id, ds.game_date)
        if (recPrice === null) {
          return null
        }

        const currentPrice = ds.stocks.last_price || 0

        // 누적 수익률 계산: (현재가 - 추천 시작가) / 추천 시작가 * 100
        let cumulativeChangeRate = 0
        if (recPrice > 0) {
          cumulativeChangeRate = Number(((currentPrice - recPrice) / recPrice * 100).toFixed(2))
        }

        // 경과 일수 계산
        const gameDateNum = new Date(ds.game_date).getTime()
        const diffTime = todayNum - gameDateNum
        const daysPassed = Math.floor(diffTime / (1000 * 60 * 60 * 24))

        return {
          id: Number(ds.stocks.id),
          daily_id: ds.id,
          game_date: ds.game_date,
          created_at: ds.created_at,
          name: ds.stocks.name,
          code: ds.stocks.code,
          last_price: currentPrice,
          change_amount: ds.stocks.change_amount || 0,
          change_rate: ds.stocks.change_rate || 0,
          ai_score: ds.ai_score || 0,
          ai_result: ds.ai_result || 'pending',
          status: ds.status || 'pending',
          summary: decodeHtmlEntities(ds.llm_summary || ''),
          rec_price: recPrice,
          days_passed: daysPassed,
          cumulative_change_rate: cumulativeChangeRate,
          target_price: ds.target_price,
          target_date: ds.target_date
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)

    if (items.length > 0) {
      return { items, emptyReason: null }
    }

    if ((data || []).length > 0) {
      return { items: [], emptyReason: 'join_missing' as const }
    }

    return { items: [], emptyReason: 'no_data' as const }
  }

  const fetchAiHistoryMonthly = async (year: number, month: number) => {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const { data, error } = await client
      .from('daily_stocks')
      .select(`
        id,
        game_date,
        created_at,
        llm_summary,
        ai_score,
        ai_result,
        target_price,
        target_date,
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
      .gte('game_date', startDate)
      .lte('game_date', endDate)
      .order('game_date', { ascending: true })

    if (error) {
      console.error('Error fetching AI monthly history:', error)
      return []
    }

    const stockIds = (data || []).map((ds: any) => ds.stocks?.id).filter(Boolean)
    const gameDates = (data || []).map((ds: any) => ds.game_date).filter(Boolean)

    const historyPrices = await loadRecPriceHistory(client, stockIds, gameDates)

    return (data || [])
      .filter((ds: any) => ds.stocks)
      .map((ds: any) => {
        // 추천 기준가(rec_price) 결정. 시세가 없으면 추천 항목에서 제외(지움)
        const recPrice = resolveRecPrice(historyPrices, ds.stocks.id, ds.game_date)
        if (recPrice === null) {
          return null
        }

        const currentPrice = ds.stocks.last_price || 0

        let cumulativeChangeRate = 0
        if (recPrice > 0) {
          cumulativeChangeRate = Number(((currentPrice - recPrice) / recPrice * 100).toFixed(2))
        }

        return {
          id: Number(ds.stocks.id),
          daily_id: ds.id,
          game_date: ds.game_date,
          created_at: ds.created_at,
          name: ds.stocks.name,
          code: ds.stocks.code,
          sector: ds.stocks.sector || '-',
          last_price: currentPrice,
          change_amount: ds.stocks.change_amount || 0,
          change_rate: ds.stocks.change_rate || 0,
          ai_score: ds.ai_score || 0,
          ai_result: ds.ai_result || 'pending',
          target_price: ds.target_price,
          target_date: ds.target_date,
          summary: decodeHtmlEntities(ds.llm_summary || ''),
          rec_price: recPrice,
          cumulative_change_rate: cumulativeChangeRate
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
  }

  return { fetchAiHistory, fetchAiHistoryMonthly }
}
