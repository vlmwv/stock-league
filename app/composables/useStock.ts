interface Stock {
  id: number
  name: string
  code: string
  last_price: number
  change_amount: number
  change_rate: number
  summary: string
}

export const useStock = () => {
  const client = useSupabaseClient()

  // KST (UTC+9) 날짜 구하기 헬퍼
  const getKstDate = () => {
    const now = new Date()
    const kstDate = new Date(now.getTime() + (9 * 60 * 60 * 1000))
    return kstDate.toISOString().split('T')[0]
  }
  
  // 1. Fetch today's daily stocks with stock details
  const { data: stocks, refresh, error: fetchError } = useAsyncData('dailyStocks', async () => {
    // KST (UTC+9) 기준으로 오늘 날짜 구하기
    const now = new Date()
    const kstDate = new Date(now.getTime() + (9 * 60 * 60 * 1000))
    const today = kstDate.toISOString().split('T')[0]
    
    console.log(`[useStock] Fetching stocks for KST today: ${today}`)
    
    // Join daily_stocks with stocks and news (latest summary)
    let { data, error } = await client
      .from('daily_stocks')
      .select(`
        id,
        game_date,
        llm_summary,
        stocks (
          id,
          code,
          name,
          last_price,
          change_amount,
          change_rate
        )
      `)
      .eq('game_date', today as any)
    
    // Fallback: If no data for today, fetch latest available stock data
    if (!error && (!data || data.length === 0)) {
      console.log(`No daily stocks found for ${today}, fetching latest available...`)
      const { data: latestDateData } = await client
        .from('daily_stocks')
        .select('game_date')
        .order('game_date', { ascending: false })
        .limit(1)
      
      const latestDateItem = (latestDateData as any)?.[0]
      if (latestDateItem && latestDateItem.game_date) {
        const latestDate = latestDateItem.game_date
        const { data: fallbackData, error: fallbackError } = await client
          .from('daily_stocks')
          .select(`
            id,
            game_date,
            llm_summary,
            stocks (
              id,
              code,
              name,
              last_price,
              change_amount,
              change_rate
            )
          `)
          .eq('game_date', latestDate)
        
        if (!fallbackError && fallbackData) {
          data = fallbackData
        }
      }
    }
    
    if (error) {
      console.error('Supabase Error:', error)
      return []
    }

    // Map to local Stock interface
    return (data || []).filter((ds: any) => ds.stocks).map((ds: any) => ({
      id: ds.stocks.id,
      daily_id: ds.id,
      name: ds.stocks.name,
      code: ds.stocks.code,
      last_price: ds.stocks.last_price || 0,
      change_amount: ds.stocks.change_amount || 0,
      change_rate: ds.stocks.change_rate || 0,
      summary: ds.llm_summary || '오늘의 종목 요약 정보를 생성 중입니다...'
    }))
  })

  // 2. Fallback to mock data if no data exists in DB
  const { data: recommended, refresh: refreshRecommended } = useAsyncData('recommendedStocks', async () => {
    // Fetch latest 10 news items with stock details
    const { data, error } = await client
      .from('news')
      .select(`
        llm_summary,
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
    
    if (error) return []
    return (data || []).filter((n: any) => n.stocks).map((n: any) => ({
      id: n.stocks.id,
      name: n.stocks.name,
      code: n.stocks.code,
      last_price: n.stocks.last_price || 0,
      change_amount: n.stocks.change_amount || 0,
      change_rate: n.stocks.change_rate || 0,
      summary: n.llm_summary
    }))
  })

  // 3. Fetch stocks ordered by market cap rank
  const { data: marketCapStocks, refresh: refreshMarketCap } = useAsyncData('marketCapStocks', async () => {
    const { data, error } = await client
      .from('stocks')
      .select('*')
      .order('market_cap_rank', { ascending: true })
      .limit(50)
    
    if (error) return []
    return (data || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      last_price: s.last_price || 0,
      change_amount: s.change_amount || 0,
      change_rate: s.change_rate || 0,
      market_cap_rank: s.market_cap_rank,
      summary: s.summary || ''
    }))
  })

  const dailyStocks = computed(() => {
    if (stocks.value && stocks.value.length > 0) {
      return stocks.value
    }
    return [
      { id: 1, name: '삼성전자(MOCK)', code: '005930', last_price: 72500, change_amount: 1200, change_rate: 1.68, summary: 'DB 데이터가 없거나 로드 전입니다.' },
      { id: 2, name: 'SK하이닉스(MOCK)', code: '000660', last_price: 142000, change_amount: -500, change_rate: -0.35, summary: 'DB 데이터가 없거나 로드 전입니다.' },
      { id: 3, name: 'LG에너지솔루션(MOCK)', code: '373220', last_price: 385000, change_amount: 0, change_rate: 0.0, summary: 'DB 데이터가 없거나 로드 전입니다.' },
      { id: 4, name: 'NAVER(MOCK)', code: '035420', last_price: 198000, change_amount: 4500, change_rate: 2.33, summary: 'DB 데이터가 없거나 로드 전입니다.' },
      { id: 5, name: '카카오(MOCK)', code: '035720', last_price: 48000, change_amount: -200, change_rate: -0.42, summary: 'DB 데이터가 없거나 로드 전입니다.' }
    ]
  })

  const hearts = useState<number[]>('wishlist', () => [])
  const myPredictions = useState<{ stockId: number, prediction: 'up' | 'down' }[]>('myPredictions', () => [])

  const fetchPredictions = async () => {
    const { data: user } = await client.auth.getUser()
    if (!user.user) return

    const today = getKstDate()
    
    const { data, error } = await client
      .from('predictions')
      .select('stock_id, prediction_type')
      .eq('user_id', user.user.id)
      .eq('game_date', today as any)
    
    if (!error && (data as any)) {
      myPredictions.value = (data as any).map((p: any) => ({
        stockId: p.stock_id,
        prediction: p.prediction_type
      }))
    }
  }

  const fetchWishlist = async () => {
    const { data: user } = await client.auth.getUser()
    if (!user.user) return

    const { data, error } = await client
      .from('wishlists')
      .select('stock_id')
      .eq('user_id', user.user.id)
    
    if (!error && data) {
      hearts.value = data.map((w: any) => w.stock_id)
    }
  }

  const toggleHeart = async (stockId: number) => {
    const { data: user } = await client.auth.getUser()
    if (!user.user) return

    const isHearted = hearts.value.includes(stockId)
    
    if (isHearted) {
      const { error } = await (client
        .from('wishlists')
        .delete() as any)
        .eq('user_id', user.user.id)
        .eq('stock_id', stockId)
      
      if (!error) {
        hearts.value = hearts.value.filter(id => id !== stockId)
      }
    } else {
      const { error } = await (client
        .from('wishlists')
        .insert({ user_id: user.user.id, stock_id: stockId } as any) as any)
      
      if (!error) {
        hearts.value.push(stockId)
      }
    }
  }

  const predict = async (stockId: number, prediction: 'up' | 'down') => {
    const { data: user } = await client.auth.getUser()
    if (!user.user) return

    const today = getKstDate()
    
    const { error } = await (client
      .from('predictions')
      .upsert({
        user_id: user.user.id,
        stock_id: stockId,
        game_date: today,
        prediction_type: prediction,
        result: 'pending'
      } as any, { onConflict: 'user_id, stock_id, game_date' } as any) as any)

    if (!error && myPredictions.value) {
      const index = myPredictions.value.findIndex(p => p.stockId === stockId)
      if (index > -1 && myPredictions.value[index]) {
        myPredictions.value[index].prediction = prediction
      } else {
        myPredictions.value.push({ stockId, prediction })
      }
    }
  }

  const fetchRankings = async () => {
    const { data, error } = await client
      .from('profiles')
      .select('username, avatar_url, points')
      .order('points', { ascending: false })
      .limit(20)
    
    if (error) {
      console.error('Error fetching rankings:', error)
      return []
    }
    return data || []
  }

  const fetchUserStats = async () => {
    const { data: userData } = await client.auth.getUser()
    if (!userData.user) return null

    const userId = userData.user.id

    // 1. Get points and profile
    const { data: profile } = await client
      .from('profiles')
      .select('points')
      .eq('id', userId)
      .single()

    // 2. Get rank (number of users with more points + 1)
    const { count: higherRankCount } = await client
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gt('points', (profile as any)?.points || 0)

    const rank = (higherRankCount || 0) + 1

    // 3. Get win rate and total games
    const { data: predictions } = await client
      .from('predictions')
      .select('result')
      .eq('user_id', userId)

    const totalGames = (predictions as any)?.length || 0
    const wins = (predictions as any)?.filter((p: any) => p.result === 'win').length || 0
    const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0

    // 4. Calculate Streak
    const { data: dateRecords } = await client
      .from('predictions')
      .select('game_date')
      .eq('user_id', userId)
      .order('game_date', { ascending: false })

    let streak = 0
    if (dateRecords && (dateRecords as any).length > 0) {
      const uniqueDates = [...new Set((dateRecords as any).map((d: any) => d.game_date))]
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      let currentCheck = new Date(uniqueDates[0] as string)
      currentCheck.setHours(0, 0, 0, 0)
      
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      
      if (currentCheck >= yesterday) {
        streak = 1
        for (let i = 1; i < uniqueDates.length; i++) {
          const prevDate = new Date(uniqueDates[i] as string)
          prevDate.setHours(0, 0, 0, 0)
          
          const expectedPrevDate = new Date(currentCheck)
          expectedPrevDate.setDate(expectedPrevDate.getDate() - 1)
          
          if (prevDate.getTime() === expectedPrevDate.getTime()) {
            streak++
            currentCheck = prevDate
          } else {
            break
          }
        }
      }
    }

    return {
      points: (profile as any)?.points || 0,
      rank,
      winRate,
      totalGames,
      streak
    }
  }

  const fetchUserHistory = async () => {
    const { data: userData } = await client.auth.getUser()
    if (!userData.user) return []

    const { data, error } = await client
      .from('predictions')
      .select(`
        id,
        game_date,
        prediction_type,
        result,
        points_awarded,
        stocks (
          name
        )
      `)
      .eq('user_id', userData.user.id)
      .order('game_date', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Error fetching history:', error)
      return []
    }

    return (data || []).map((p: any) => ({
      id: p.id,
      game_date: p.game_date,
      prediction_type: p.prediction_type,
      result: p.result,
      points_awarded: p.points_awarded,
      stockName: (p.stocks as any)?.name || '알 수 없는 종목'
    }))
  }

  return {
    dailyStocks,
    recommendedStocks: recommended,
    marketCapStocks,
    hearts,
    myPredictions,
    refresh,
    fetchError,
    fetchWishlist,
    fetchPredictions,
    refreshMarketCap,
    refreshRecommended,
    toggleHeart,
    predict,
    fetchRankings,
    fetchUserStats,
    fetchUserHistory
  }
}
