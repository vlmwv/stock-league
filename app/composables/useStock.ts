interface Stock {
  id: number
  name: string
  code: string
  last_price: number
  change_amount: number
  change_rate: number
  summary: string
  game_date?: string
  daily_id?: number
}

export const useStock = () => {
  const client = useSupabaseClient()
  const user = useSupabaseUser()
  const toast = useToast()

  const resolveUserId = async () => {
    if (user.value?.id) return user.value.id
    const { data, error } = await client.auth.getSession()
    if (error) {
      console.warn('[useStock] Failed to resolve auth session:', error.message)
      return null
    }
    return data.session?.user?.id ?? null
  }

  const getKstDate = () => {
    // Intl.DateTimeFormat을 사용하여 시스템 TZ에 관계없이 항상 KST 날짜 반환
    const options = { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' } as const
    const d = new Intl.DateTimeFormat('sv-SE', options).format(new Date())
    return d
  }

  const getKstHourMinute = () => {
    const options = { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false } as const
    const parts = new Intl.DateTimeFormat('en-GB', options).format(new Date()).split(':')
    const hour = parts[0] || '0'
    const minute = parts[1] || '0'
    return { hour: parseInt(hour), minute: parseInt(minute), timeVal: parseInt(hour) * 100 + parseInt(minute) }
  }

  // 실시간 상태 업데이트를 위한 시간 Ref (매분 업데이트)
  const kstTime = useState('kst_time', () => getKstHourMinute())
  if (process.client) {
    onMounted(() => {
      const timer = setInterval(() => {
        kstTime.value = getKstHourMinute()
      }, 30000) // 30초마다 갱신
      onUnmounted(() => clearInterval(timer))
    })
  }
  
  // 1. Fetch today's daily stocks with stock details
  const { data: stocks, refresh, error: fetchError } = useAsyncData('dailyStocks', async () => {
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

    console.log(`[useStock] Fetching stocks for target date: ${targetDate} (today: ${today}, searchDate: ${searchDate})`)
    
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
      .eq('game_date', targetDate as any)
    
    // Fallback: If no future data, fetch latest available stock data
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
      id: Number(ds.stocks.id),
      daily_id: ds.id,
      game_date: ds.game_date,
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
      id: Number(n.stocks.id),
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
      summary: s.summary || ''
    }))
  })

  const dailyStocks = computed(() => {
    if (stocks.value && stocks.value.length > 0) {
      return stocks.value
    }
    const today = getKstDate()
    return [
      { id: 1, daily_id: 1, game_date: today, name: '삼성전자(MOCK)', code: '005930', last_price: 72500, change_amount: 1200, change_rate: 1.68, summary: 'DB 데이터가 없거나 로드 전입니다.' },
      { id: 2, daily_id: 2, game_date: today, name: 'SK하이닉스(MOCK)', code: '000660', last_price: 142000, change_amount: -500, change_rate: -0.35, summary: 'DB 데이터가 없거나 로드 전입니다.' },
      { id: 3, daily_id: 3, game_date: today, name: 'LG에너지솔루션(MOCK)', code: '373220', last_price: 385000, change_amount: 0, change_rate: 0.0, summary: 'DB 데이터가 없거나 로드 전입니다.' },
      { id: 4, daily_id: 4, game_date: today, name: 'NAVER(MOCK)', code: '035420', last_price: 198000, change_amount: 4500, change_rate: 2.33, summary: 'DB 데이터가 없거나 로드 전입니다.' },
      { id: 5, daily_id: 5, game_date: today, name: '카카오(MOCK)', code: '035720', last_price: 48000, change_amount: -200, change_rate: -0.42, summary: 'DB 데이터가 없거나 로드 전입니다.' }
    ]
  })

  const hearts = useState<number[]>('wishlist', () => [])
  const myPredictions = useState<{ stockId: number, prediction: 'up' | 'down', result?: 'win' | 'lose' | 'draw' | 'pending' }[]>('myPredictions', () => [])
  const participantCount = useState<number>('participantCount', () => 0)
  const totalMemberCount = useState<number>('totalMemberCount', () => 0)
  const isWishlistFetching = useState<boolean>('isWishlistFetching', () => false)
  
  // 4. League Status (Closed after 08:00 KST)
  const isLeagueOpen = computed(() => {
    const { hour, timeVal: currentTimeVal } = kstTime.value
    const today = getKstDate()

    if (stocks.value && (stocks.value as any).length > 0) {
      const firstStockDate = (stocks.value as any)[0].game_date
      
      // 과거 데이터는 마감
      if (firstStockDate < today) return false
      
      // 미래 데이터(내일 등)
      if (firstStockDate > today) {
        // 이미 21:20이 지났거나, 내일 당일 08:00 전이면 오픈
        return currentTimeVal >= 2120 || hour < 8
      }
      
      // 오늘 데이터인 경우 08:00 전까지만 오픈
      if (firstStockDate === today) {
        return hour < 8
      }
    }

    return hour < 8
  })

  // 5. Result Status (Published after 20:20 KST)
  const isResultPublished = computed(() => {
    const { timeVal: currentTimeVal } = kstTime.value
    const today = getKstDate()

    if (stocks.value && (stocks.value as any).length > 0) {
      const firstStockDate = (stocks.value as any)[0].game_date
      
      // 과거 데이터는 항상 결과 발표됨
      if (firstStockDate < today) return true
      
      // 오늘 데이터인 경우 20:20 이후면 발표됨
      if (firstStockDate === today) {
        return currentTimeVal >= 2020
      }
    }

    return false
  })

  const fetchPredictions = async (date?: string) => {
    const userId = await resolveUserId()
    if (!userId) {
      console.log('[useStock] Skipping fetchPredictions: No user logged in')
      myPredictions.value = []
      return
    }

    // 인자로 받은 날짜가 있으면 사용, 없으면 오늘 날짜 사용
    const targetDate = date || getKstDate()
    
    console.log(`[useStock] Fetching predictions for date: ${targetDate}`)
    const { data, error } = await client
      .from('predictions')
      .select('stock_id, prediction_type, result')
      .eq('user_id', userId)
      .eq('game_date', targetDate as any)
    
    if (!error && data) {
      myPredictions.value = (data as any).map((p: any) => ({
        stockId: Number(p.stock_id),
        prediction: p.prediction_type,
        result: p.result
      }))
    }
  }

  const fetchParticipantCount = async () => {
    const today = getKstDate()
    
    // 1. 오늘 참여자 수 (unique user_ids who made predictions today)
    const { data, error } = await client
      .from('predictions')
      .select('user_id')
      .eq('game_date', today as any)
    
    if (!error && data) {
      const uniqueUsers = new Set(data.map((p: any) => p.user_id)).size
      participantCount.value = uniqueUsers
    }

    // 2. 전체 회원 수 (total profiles count)
    const { count, error: countError } = await client
      .from('profiles')
      .select('*', { count: 'exact', head: true })
    
    if (!countError && count !== null) {
      totalMemberCount.value = count
    }
  }

  const fetchWishlist = async () => {
    const userId = await resolveUserId()
    if (!userId) {
      console.log('[useStock] Skipping fetchWishlist: No user logged in')
      hearts.value = []
      return
    }

    if (isWishlistFetching.value) {
      console.log('[useStock] fetchWishlist already in progress, skipping...')
      return
    }

    isWishlistFetching.value = true
    try {
      const { data, error } = await client
        .from('wishlists')
        .select('stock_id')
        .eq('user_id', userId)
      
      if (!error && data) {
        hearts.value = data.map((w: any) => Number(w.stock_id))
        console.log('[useStock] Wishlist fetched and normalized:', hearts.value)
      } else if (error) {
        console.error('[useStock] Wishlist fetch error:', error)
      }
    } finally {
      isWishlistFetching.value = false
    }
  }

  const { data: wishlistStocks, refresh: refreshWishlistStocks } = useAsyncData('wishlistStocks', async () => {
    if (hearts.value.length === 0) return []
    
    const { data, error } = await client
      .from('stocks')
      .select('*')
      .in('id', hearts.value)
    
    if (error) return []
    return (data || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      last_price: s.last_price || 0,
      change_amount: s.change_amount || 0,
      change_rate: s.change_rate || 0,
      summary: s.summary || ''
    }))
  }, { watch: [hearts] })

  const toggleHeart = async (stockId: number) => {
    const userId = await resolveUserId()
    if (!userId) {
      if (process.client && confirm('로그인이 필요한 기능입니다.\n로그인 페이지로 이동할까요?')) {
        navigateTo('/login')
      }
      return
    }

    const id = Number(stockId)
    if (isNaN(id)) return

    const isCurrentlyHearted = hearts.value.includes(id)
    const previousHearts = [...hearts.value]

    // 1. 낙관적 업데이트: UI 즉시 반영
    if (isCurrentlyHearted) {
      hearts.value = hearts.value.filter(hId => Number(hId) !== id)
    } else {
      hearts.value = [...hearts.value, id]
    }
    refreshWishlistStocks()

    try {
      if (isCurrentlyHearted) {
        // 제거 요청 (명시적 user_id + stock_id 필터)
        const { error } = await client
          .from('wishlists')
          .delete()
          .eq('user_id', userId)
          .eq('stock_id', id)
        
        if (error) {
          console.error('[useStock] Supabase delete error detail:', error)
          throw new Error(`Delete failed: ${error.message} (code ${error.code})`)
        }
        toast.add({
          title: '관심 종목에서 제거했어요',
          description: '찜이 해제되었습니다.',
          color: 'neutral',
          icon: 'i-heroicons-heart'
        })
      } else {
        // 추가 요청: upsert는 RLS UPDATE 정책이 없으면 충돌 시 실패할 수 있어 insert + unique 에러 무시 사용
        const { error } = await client
          .from('wishlists')
          .insert({ user_id: userId, stock_id: id } as any) as any
        
        // 이미 존재하는 찜(unique 위반)은 정상 상태이므로 무시
        if (error && error.code !== '23505') {
          console.error('[useStock] Supabase wishlist insert error:', error)
          throw new Error(`Insert failed: ${error.message} (code ${error.code})`)
        }
        toast.add({
          title: '관심 종목에 추가했어요',
          description: '찜 목록에서 바로 확인할 수 있습니다.',
          color: 'primary',
          icon: 'i-heroicons-heart-20-solid'
        })
      }
      
      // 서버 상태와 UI 상태를 즉시 동기화
      await fetchWishlist()
      refreshWishlistStocks()
      
    } catch (err: any) {
      console.error('[useStock] toggleHeart fallback! error:', err.message || err)
      // 에러 발생 시 원래 상태로 복구
      hearts.value = previousHearts
      refreshWishlistStocks()
      toast.add({
        title: '찜 상태 변경에 실패했어요',
        description: '잠시 후 다시 시도해 주세요.',
        color: 'error',
        icon: 'i-heroicons-exclamation-triangle'
      })
      
      if (process.client && err.message.includes('RLS')) {
         console.warn('[useStock] RLS error detected. Session might be stale.')
      }
    }
  }

  // 사용자 상태 감시: 로그인/로그아웃 시 데이터 동기화 (함수 정의 후로 이동)
  watch(user, async (newUser) => {
    if (newUser?.id) {
      console.log('[useStock] User session detected, syncing data...')
      await Promise.all([
        fetchWishlist(),
        fetchPredictions()
      ])
    } else if (!newUser) {
      console.log('[useStock] No user session, clearing heartbeat/predictions')
      hearts.value = []
      myPredictions.value = []
    }
  }, { immediate: true })

  const predict = async (stockId: number, prediction: 'up' | 'down', gameDate?: string) => {
    if (!isLeagueOpen.value) {
      alert('오늘의 예측은 08:00에 마감되었습니다.')
      return false
    }

    const userId = await resolveUserId()
    if (!userId) {
      if (process.client && confirm('로그인이 필요한 기능입니다.\n로그인 페이지로 이동할까요?')) {
        navigateTo('/login')
      }
      return false
    }

    const targetDate = gameDate || getKstDate()
    
    // 1. 낙관적 업데이트 (Optimistic Update)
    const previousPredictions = [...myPredictions.value]
    const current = [...previousPredictions]
    const index = current.findIndex(p => Number(p.stockId) === Number(stockId))
    
    if (index > -1 && current[index]) {
      current[index] = { ...current[index], prediction }
    } else {
      current.push({ stockId: Number(stockId), prediction, result: 'pending' })
    }
    myPredictions.value = current

    try {
      const { error } = await (client
        .from('predictions')
        .upsert({
          user_id: userId,
          stock_id: stockId,
          game_date: targetDate,
          prediction_type: prediction,
          result: 'pending'
        } as any, { onConflict: 'user_id,stock_id,game_date' } as any) as any)

      if (error) {
        throw error
      }
      
      return true
    } catch (err: any) {
      console.error('[useStock] Prediction failed:', err.message || err)
      // 2. 에러 시 원래 상태로 복구 (Rollback)
      myPredictions.value = previousPredictions
      
      toast.add({
        title: '예측 저장에 실패했어요',
        description: '잠시 후 다시 시도해 주세요.',
        color: 'error',
        icon: 'i-heroicons-exclamation-triangle'
      })
      return false
    }
  }

  const fetchRankings = async (limitNum = 100, sortBy: 'win_rate' | 'prediction_count' | 'win_count' | 'rank' = 'rank') => {
    let query = client
      .from('profiles')
      .select(`
        username,
        avatar_url,
        points,
        rankings(prediction_count, win_rate, win_count)
      `)
    
    // global all_time 랭킹의 경우 기본은 points 정렬
    if (sortBy === 'rank') {
      query = query.order('points', { ascending: false })
    }
    
    const { data, error } = await query.limit(limitNum)
    
    if (error) {
      console.error('Error fetching rankings:', error)
      return []
    }

    let results = ((data as any[]) || []).map((p) => {
      const stats = (p.rankings as any[])?.find(r => r.ranking_type === 'all_time' && r.period_key === 'global') || { prediction_count: 0, win_rate: 0, win_count: 0 }
      return {
        username: p.username,
        avatar_url: p.avatar_url,
        points: p.points,
        prediction_count: stats.prediction_count,
        win_rate: stats.win_rate,
        win_count: stats.win_count || Math.round(stats.prediction_count * (stats.win_rate / 100)),
        rank: 0 // Will be set after sorting
      }
    })

    // 클라이언트 측 정렬 (복합 객체 기반이므로)
    if (sortBy === 'win_rate') {
      results.sort((a, b) => b.win_rate - a.win_rate || b.prediction_count - a.prediction_count)
    } else if (sortBy === 'prediction_count') {
      results.sort((a, b) => b.prediction_count - a.prediction_count || b.win_rate - a.win_rate)
    } else if (sortBy === 'win_count') {
      results.sort((a, b) => b.win_count - a.win_count || b.win_rate - a.win_rate)
    }

    return results.map((r, i) => ({ ...r, rank: i + 1 }))
  }

  const fetchUserStats = async () => {
    const userId = await resolveUserId()
    if (!userId) return null

    // 1. Get points and profile
    const { data: profile } = await client
      .from('profiles')
      .select('username, avatar_url, points, role')
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
      username: (profile as any)?.username,
      avatarUrl: (profile as any)?.avatar_url,
      points: (profile as any)?.points || 0,
      role: (profile as any)?.role || 'user',
      rank,
      winRate,
      totalGames,
      streak
    }
  }

  const updateProfile = async (username: string) => {
    const userId = await resolveUserId()
    if (!userId) return false

    const { error } = await (client
      .from('profiles') as any)
      .update({ username })
      .eq('id', userId)

    if (error) {
      console.error('Error updating profile:', error)
      return false
    }
    return true
  }

  const fetchUserHistory = async () => {
    const userId = await resolveUserId()
    if (!userId) return []

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
      .eq('user_id', userId)
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

  const fetchStocksWithStats = async (
    orderBy: 'market_cap_rank' | 'wishlist_count' | 'win_count' = 'market_cap_rank',
    page = 1,
    pageSize = 10,
    searchQuery = ''
  ) => {
    try {
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      // 1. 모든 종목 정보 (페이징 및 검색 적용)
      let query = client
        .from('stocks')
        .select('id, name, code, last_price, change_amount, change_rate, market_cap_rank, summary, wishlist_count, win_count', { count: 'exact' })

      if (searchQuery.trim()) {
        const q = searchQuery.trim()
        query = query.or(`name.ilike.%${q}%,code.ilike.%${q}%`)
      }

      const { data: stocksData, error: stocksError, count } = await query
        .order(orderBy, { ascending: orderBy === 'market_cap_rank' })
        .range(from, to)
      
      if (stocksError) {
        console.error('[useStock] Error fetching stocks with stats:', stocksError.message)
        
        // Fallback: wishlist_count, win_count가 없어서 실패했을 수 있으므로 기본 정보만 다시 시도
        console.log('[useStock] Attempting fallback fetch without stats columns...')
        let fallbackQuery = client
          .from('stocks')
          .select('id, name, code, last_price, change_amount, change_rate, market_cap_rank, summary', { count: 'exact' })

        if (searchQuery.trim()) {
          const q = searchQuery.trim()
          fallbackQuery = fallbackQuery.or(`name.ilike.%${q}%,code.ilike.%${q}%`)
        }

        const { data: fallbackData, error: fallbackError, count: fallbackCount } = await fallbackQuery
          .order('market_cap_rank', { ascending: true })
          .range(from, to)
        
        if (fallbackError) {
          console.error('[useStock] Fallback fetch also failed:', fallbackError.message)
          return { data: [], count: 0 }
        }
        
        return {
          data: (fallbackData as any[]).map(s => ({
            id: s.id,
            name: s.name,
            code: s.code,
            last_price: s.last_price || 0,
            change_amount: s.change_amount || 0,
            change_rate: s.change_rate || 0,
            market_cap_rank: s.market_cap_rank,
            summary: s.summary || '',
            wishlist_count: 0,
            win_count: 0
          })),
          count: fallbackCount || 0
        }
      }

      if (!stocksData) return { data: [], count: 0 }

      return {
        data: (stocksData as any[]).map(s => ({
          id: Number(s.id),
          name: s.name,
          code: s.code,
          last_price: s.last_price || 0,
          change_amount: s.change_amount || 0,
          change_rate: s.change_rate || 0,
          market_cap_rank: s.market_cap_rank,
          summary: s.summary || '',
          wishlist_count: s.wishlist_count || 0,
          win_count: s.win_count || 0
        })),
        count: count || 0
      }
    } catch (err: any) {
      console.error('[useStock] Unexpected error in fetchStocksWithStats:', err.message)
      return { data: [], count: 0 }
    }
  }
  const fetchNews = async (limitNum = 20) => {
    const { data, error } = await client
      .from('news')
      .select(`
        id,
        title,
        content,
        url,
        source,
        published_at,
        llm_summary,
        type,
        stocks (
          id,
          name,
          code
        )
      `)
      .order('published_at', { ascending: false })
      .limit(limitNum)
    
    if (error) {
      console.error('Error fetching news:', error)
      return []
    }

    return (data || []).map((n: any) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      url: n.url,
      source: n.source,
      published_at: n.published_at,
      llm_summary: n.llm_summary,
      type: n.type || 'news',
      stockId: (n.stocks as any)?.id ? Number((n.stocks as any).id) : null,
      stockName: (n.stocks as any)?.name,
      stockCode: (n.stocks as any)?.code
    }))
  }

  const fetchStockById = async (id: number) => {
    const { data, error } = await client
      .from('stocks')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) {
      console.error('Error fetching stock by id:', error)
      return null
    }
    return data
  }

  const fetchPriceHistory = async (stockId: number, days = 30) => {
    const { data, error } = await client
      .from('stock_price_history')
      .select('*')
      .eq('stock_id', stockId)
      .order('price_date', { ascending: true })
      .limit(days)
    
    if (error) {
      console.error('Error fetching price history:', error)
      return []
    }
    return data
  }

  return {
    dailyStocks,
    recommendedStocks: recommended,
    marketCapStocks,
    hearts,
    myPredictions,
    wishlistStocks,
    participantCount,
    totalMemberCount,
    refresh,
    fetchError,
    fetchWishlist,
    refreshWishlistStocks,
    fetchPredictions,
    refreshMarketCap,
    refreshRecommended,
    fetchParticipantCount,
    fetchNews,
    fetchStockById,
    fetchPriceHistory,
    toggleHeart,
    predict,
    fetchRankings,
    fetchUserStats,
    fetchUserHistory,
    fetchStocksWithStats,
    isLeagueOpen,
    isResultPublished,
    updateProfile
  }
}
