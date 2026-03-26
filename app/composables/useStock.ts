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
  
  // 1. Fetch today's daily stocks with stock details
  const { data: stocks, refresh, error: fetchError } = useAsyncData('dailyStocks', async () => {
    const today = new Date().toISOString().split('T')[0]
    
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

  const dailyStocks = computed(() => {
// ...
    if (stocks.value && stocks.value.length > 0) {
      return stocks.value
    }
    // ... mock data remains same
    return [
      { id: 1, name: '삼성전자(MOCK)', code: '005930', last_price: 72500, change_amount: 1200, change_rate: 1.68, summary: 'DB 데이터가 없거나 로드 전입니다.' },
      { id: 2, name: 'SK하이닉스(MOCK)', code: '000660', last_price: 142000, change_amount: -500, change_rate: -0.35, summary: 'DB 데이터가 없거나 로드 전입니다.' },
      { id: 3, name: 'LG에너지솔루션(MOCK)', code: '373220', last_price: 385000, change_amount: 0, change_rate: 0.0, summary: 'DB 데이터가 없거나 로드 전입니다.' },
      { id: 4, name: 'NAVER(MOCK)', code: '035420', last_price: 198000, change_amount: 4500, change_rate: 2.33, summary: 'DB 데이터가 없거나 로드 전입니다.' },
      { id: 5, name: '카카오(MOCK)', code: '035720', last_price: 48000, change_amount: -200, change_rate: -0.42, summary: 'DB 데이터가 없거나 로드 전입니다.' }
    ]
  })
// ... remaining methods

  const hearts = useState<number[]>('wishlist', () => [])
  const myPredictions = useState<{ stockId: number, prediction: 'up' | 'down' }[]>('myPredictions', () => [])

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

    const today = new Date().toISOString().split('T')[0]
    
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

  return {
    dailyStocks,
    recommendedStocks: recommended,
    hearts,
    myPredictions,
    refresh,
    fetchError,
    fetchWishlist,
    toggleHeart,
    predict
  }
}
