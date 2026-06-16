import { decodeHtmlEntities, isEtf } from '~/utils/stock'
import { loadRecPriceHistory, resolveRecPrice } from '~/utils/stockHistory'

// 오늘(또는 21:20 이후 내일)의 리그 종목, AI 추천 top5, 시총 순위, 타겟가 종목을 조회하고
// 리그 오픈/결과 발표 상태를 KST 기준으로 판정한다. 21:20 경과 시 종목을 자동 새로고침한다.
export const useDailyStocks = () => {
  const { client } = useStockClient()
  const { getKstDate, getKstHourMinute, kstTime } = useKstTime()

  // 실시간 시각 갱신 (30초). 21:20 경과 시 내일 종목 자동 새로고침.
  if (import.meta.client) {
    onMounted(() => {
      // SSR hydration 직후 즉시 클라이언트 현재 시각으로 갱신
      kstTime.value = getKstHourMinute()
      const timer = setInterval(() => {
        const prev = kstTime.value.timeVal
        kstTime.value = getKstHourMinute()
        // 21:20이 되는 순간 종목 데이터를 자동 새로고침 (내일 종목 로드)
        if (prev < 2120 && kstTime.value.timeVal >= 2120) {
          console.log('[useDailyStocks] 21:20 경과: 내일 종목 자동 새로고침')
          refresh()
        }
      }, 30000) // 30초마다 갱신
      onUnmounted(() => clearInterval(timer))
    })
  }

  // 1. Fetch today's daily stocks with stock details
  const { data: stocks, refresh, error: fetchError, pending } = useAsyncData('dailyStocks', async () => {
    // KST (UTC+9) 기준으로 오늘 날짜 구하기
    const today = getKstDate()

    // 1. 참여 가능하거나 최근인 게임 종목을 가져옵니다.
    const { hour, minute } = getKstHourMinute()
    const currentTimeVal = hour * 100 + minute // 예: 21:20 -> 2120

    // 21:20 이후라면 내일 종목을 우선적으로 찾습니다.
    let searchDate = today
    if (currentTimeVal >= 2120) {
      // 내일 날짜 구하기
      const tomorrow = new Date(new Date().getTime() + (24 * 60 * 60 * 1000))
      const options = { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' } as const
      searchDate = new Intl.DateTimeFormat('sv-SE', options).format(tomorrow)
    }

    const { data: nextGameDateData } = await client
      .from('daily_stocks')
      .select('game_date')
      .gte('game_date', searchDate)
      .order('game_date', { ascending: true })
      .limit(1)

    // 만약 21:20 이후인데 내일 데이터가 아직 없다면 오늘 데이터라도 보여줍니다.
    let targetDate = (nextGameDateData as any)?.[0]?.game_date
    if (!targetDate) {
      const { data: todayData } = await client
        .from('daily_stocks')
        .select('game_date')
        .eq('game_date', today)
        .limit(1)
      targetDate = (todayData as any)?.[0]?.game_date || today
    }

    console.log(`[useDailyStocks] Fetching stocks for target date: ${targetDate} (today: ${today}, searchDate: ${searchDate})`)

    // Join daily_stocks with stocks and news (latest summary)
    const query = client
      .from('daily_stocks')
      .select(`
        id,
        game_date,
        llm_summary,
        ai_score,
        ai_result,
        target_price,
        target_date,
        status,
        stocks (
          id,
          code,
          name,
          last_price,
          change_amount,
          change_rate,
          ai_recommendation_count,
          ai_win_count,
          ai_processed_count
        )
      `)
      .eq('game_date', targetDate as any)
      .neq('status', 'withdrawn')

    const { data: initialData, error } = await query
    let data = initialData

    // Fallback: If no future data, fetch latest available stock data
    if (!error && (!data || data.length === 0)) {
      console.log(`[useDailyStocks] No daily stocks found for ${targetDate}, fetching latest available...`)
      const { data: latestDateData } = await client
        .from('daily_stocks')
        .select('game_date')
        .order('game_date', { ascending: false })
        .limit(1)

      const latestDateItem = (latestDateData as any)?.[0]
      if (latestDateItem && latestDateItem.game_date) {
        const latestDate = latestDateItem.game_date
        console.log(`[useDailyStocks] Found latest available date: ${latestDate}`)

        const q = client
          .from('daily_stocks')
          .select(`
            id,
            game_date,
            llm_summary,
            ai_score,
            ai_result,
            target_price,
            target_date,
            status,
            stocks (
              id,
              code,
              name,
              last_price,
              change_amount,
              change_rate,
              ai_recommendation_count,
              ai_win_count,
              ai_processed_count
            )
          `)
          .eq('game_date', latestDate)
          .neq('status', 'withdrawn')

        const { data: fallbackData, error: fallbackError } = await q

        if (!fallbackError && fallbackData) {
          data = fallbackData
        }
      }
    }

    if (error) {
      console.error('Supabase Error:', error)
      return []
    }

    // Map to local Stock interface and filter ETFs
    return (data || []).filter((ds: any) => ds.stocks && !isEtf(ds.stocks.name)).map((ds: any) => ({
      id: Number(ds.stocks.id),
      daily_id: ds.id,
      game_date: ds.game_date,
      name: ds.stocks.name,
      code: ds.stocks.code,
      last_price: ds.stocks.last_price || 0,
      change_amount: ds.stocks.change_amount || 0,
      change_rate: ds.stocks.change_rate || 0,
      ai_recommendation_count: ds.stocks.ai_recommendation_count || 0,
      ai_win_count: ds.stocks.ai_win_count || 0,
      ai_processed_count: ds.stocks.ai_processed_count || 0,
      ai_score: ds.ai_score || 0,
      ai_result: ds.ai_result || 'pending',
      target_price: ds.target_price,
      target_date: ds.target_date,
      summary: decodeHtmlEntities(ds.llm_summary || '오늘의 종목 요약 정보를 생성 중입니다...')
    }))
  })

  // 2. AI 추천 종목 (AI 점수 기반 고도화)
  const { data: recommended, refresh: refreshRecommended } = useAsyncData('recommendedStocks', async () => {
    const today = getKstDate()

    // 1) 당일 리그 종목 중 AI 점수가 높은 순으로 가져옴
    const { data: dailyData, error: dailyError } = await client
      .from('daily_stocks')
      .select(`
        ai_score,
        llm_summary,
        status,
        target_price,
        target_date,
        created_at,
        stocks (
          id,
          code,
          name,
          last_price,
          change_amount,
          change_rate,
          ai_recommendation_count,
          ai_win_count,
          ai_processed_count
        )
      `)
      .eq('game_date', today as any)
      .neq('status', 'withdrawn')
      .order('ai_score', { ascending: false })
      .limit(5)

    if (!dailyError && dailyData && dailyData.length > 0) {
      return dailyData
        .filter((d: any) => d.stocks && !isEtf(d.stocks.name))
        .map((d: any) => ({
          id: Number(d.stocks.id),
          name: d.stocks.name,
          code: d.stocks.code,
          last_price: d.stocks.last_price || 0,
          change_amount: d.stocks.change_amount || 0,
          change_rate: d.stocks.change_rate || 0,
          ai_recommendation_count: d.stocks.ai_recommendation_count || 0,
          ai_win_count: d.stocks.ai_win_count || 0,
          ai_processed_count: d.stocks.ai_processed_count || 0,
          ai_score: d.ai_score || 0,
          target_price: d.target_price,
          target_date: d.target_date,
          created_at: d.created_at,
          summary: decodeHtmlEntities(d.llm_summary)
        }))
    }

    // 2) Fallback: 당일 데이터가 없을 경우 가장 최근 game_date의 daily_stocks 노출
    const { data: latestDateData } = await client
      .from('daily_stocks')
      .select('game_date')
      .order('game_date', { ascending: false })
      .limit(1)

    const latestDate = (latestDateData as any)?.[0]?.game_date
    if (!latestDate) return []

    const { data: fallbackData, error: fallbackError } = await client
      .from('daily_stocks')
      .select(`
        ai_score,
        llm_summary,
        status,
        target_price,
        target_date,
        created_at,
        stocks (
          id,
          code,
          name,
          last_price,
          change_amount,
          change_rate,
          ai_recommendation_count,
          ai_win_count,
          ai_processed_count
        )
      `)
      .eq('game_date', latestDate as any)
      .neq('status', 'withdrawn')
      .order('ai_score', { ascending: false })
      .limit(5)

    if (fallbackError) return []
    return (fallbackData || [])
      .filter((d: any) => d.stocks && !isEtf(d.stocks.name))
      .map((d: any) => ({
        id: Number(d.stocks.id),
        name: d.stocks.name,
        code: d.stocks.code,
        last_price: d.stocks.last_price || 0,
        change_amount: d.stocks.change_amount || 0,
        change_rate: d.stocks.change_rate || 0,
        ai_recommendation_count: d.stocks.ai_recommendation_count || 0,
        ai_win_count: d.stocks.ai_win_count || 0,
        ai_processed_count: d.stocks.ai_processed_count || 0,
        ai_score: d.ai_score || 0,
        target_price: d.target_price,
        target_date: d.target_date,
        created_at: d.created_at,
        summary: decodeHtmlEntities(d.llm_summary || '최근 AI 추천 종목입니다.')
      }))
  })

  // 3. Fetch stocks ordered by market cap rank
  const { data: marketCapStocks, refresh: refreshMarketCap } = useAsyncData('marketCapStocks', async () => {
    const { data, error } = await client
      .from('stocks')
      .select('*')
      .order('market_cap_rank', { ascending: true })
      .limit(100)

    if (error) return []
    return (data || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      last_price: s.last_price || 0,
      change_amount: s.change_amount || 0,
      change_rate: s.change_rate || 0,
      market_cap_rank: s.market_cap_rank,
      ai_recommendation_count: s.ai_recommendation_count || 0,
      ai_win_count: s.ai_win_count || 0,
      ai_processed_count: s.ai_processed_count || 0,
      summary: decodeHtmlEntities(s.summary || '')
    }))
  }, { immediate: false })

  // 4. Fetch stocks with target prices
  const { data: targetedStocks, refresh: refreshTargetedStocks, pending: pendingTargeted } = useAsyncData('targetedStocks', async () => {
    const { data, error } = await client
      .from('daily_stocks')
      .select(`
        id,
        game_date,
        llm_summary,
        ai_score,
        target_price,
        target_date,
        stocks (
          id,
          code,
          name,
          last_price,
          change_amount,
          change_rate,
          ai_recommendation_count,
          ai_win_count,
          ai_processed_count
        )
      `)
      .not('target_price', 'is', null)
      .order('game_date', { ascending: false })

    if (error) {
      console.error('[useDailyStocks] fetchTargetedStocks error:', error)
      return []
    }

    // 추천 당시의 기준 가격(추천 전일 종가)을 가져오기 위해 stock_price_history 조회
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

        return {
          id: Number(ds.stocks.id),
          daily_id: ds.id,
          game_date: ds.game_date,
          name: ds.stocks.name,
          code: ds.stocks.code,
          last_price: ds.stocks.last_price || 0,
          change_amount: ds.stocks.change_amount || 0,
          change_rate: ds.stocks.change_rate || 0,
          ai_score: ds.ai_score || 0,
          target_price: ds.target_price,
          target_date: ds.target_date,
          summary: decodeHtmlEntities(ds.llm_summary || ''),
          rec_price: recPrice
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
  }, { immediate: false })

  const dailyStocks = computed(() => {
    return stocks.value || []
  })

  // League Status (Closed after 08:00 KST, Open after 21:20 KST)
  const isLeagueOpen = computed(() => {
    const { hour, timeVal: currentTimeVal } = kstTime.value
    const today = getKstDate()

    // 현재 시간이 참여 가능 시간대인지 판단 (21:20 ~ 다음날 08:00)
    const isInOpenWindow = currentTimeVal >= 2120 || hour < 8

    if (stocks.value && (stocks.value as any).length >= 5) {
      const firstStockDate = (stocks.value as any)[0].game_date

      // 과거 데이터는 마감
      if (firstStockDate < today) return false

      // 미래 데이터(내일 등): 21:20~08:00 참여 가능
      if (firstStockDate > today) {
        return isInOpenWindow
      }

      // 오늘 데이터인 경우 08:00 전까지만 오픈
      if (firstStockDate === today) {
        return hour < 8
      }
    }

    // 데이터가 없거나 5개 미만이면 참여 불가능
    return false
  })

  // Result Status (Published after 20:30 KST)
  const isResultPublished = computed(() => {
    const { timeVal: currentTimeVal } = kstTime.value
    const today = getKstDate()

    if (stocks.value && (stocks.value as any).length > 0) {
      const firstStockDate = (stocks.value as any)[0].game_date

      // 과거 데이터는 항상 결과 발표됨
      if (firstStockDate < today) return true

      // 오늘 데이터인 경우 20:30 이후면 발표됨 (데이터가 있을 때만)
      if (firstStockDate === today) {
        return currentTimeVal >= 2030
      }
    }

    // 데이터가 없으면 결과 발표를 보여줄 수 없음
    return false
  })

  return {
    stocks,
    refresh,
    fetchError,
    pending,
    recommended,
    refreshRecommended,
    marketCapStocks,
    refreshMarketCap,
    targetedStocks,
    refreshTargetedStocks,
    pendingTargeted,
    dailyStocks,
    isLeagueOpen,
    isResultPublished
  }
}
