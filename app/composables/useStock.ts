import { repairNewsUrl, decodeHtmlEntities, isEtf } from '~/utils/stock'

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
  wishlist_count?: number
  win_count?: number
  ai_recommendation_count?: number
  ai_win_count?: number
  ai_processed_count?: number
  ai_score?: number
  ai_result?: 'win' | 'lose' | 'draw' | 'pending'
  volume?: number
  target_price?: number
  target_date?: string
}

interface WishlistGroup {
  id: number
  user_id: string
  name: string
  icon?: string
  sort_order: number
}

interface WishlistItem {
  stock_id: number
  group_id: number
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

  const getActiveLeagueDate = () => {
    const today = getKstDate()
    const { timeVal } = getKstHourMinute()
    
    // 21:20 이후라면 다음날 리그가 활성 대상입니다.
    if (timeVal >= 2120) {
      const tomorrow = new Date(new Date().getTime() + (24 * 60 * 60 * 1000))
      const options = { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' } as const
      return new Intl.DateTimeFormat('sv-SE', options).format(tomorrow)
    }
    return today
  }

  // 실시간 상태 업데이트를 위한 시간 Ref (30초마다 갱신)
  const kstTime = useState('kst_time', () => getKstHourMinute())
  if (process.client) {
    onMounted(() => {
      // SSR hydration 직후 즉시 클라이언트 현재 시각으로 갱신
      kstTime.value = getKstHourMinute()
      const timer = setInterval(() => {
        const prev = kstTime.value.timeVal
        kstTime.value = getKstHourMinute()
        // 21:20이 되는 순간 종목 데이터를 자동 새로고침 (내일 종목 로드)
        if (prev < 2120 && kstTime.value.timeVal >= 2120) {
          console.log('[useStock] 21:20 경과: 내일 종목 자동 새로고침')
          refresh()
        }
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
    let query = client
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
    
    let { data, error } = await query
    
    // ai_result 컬럼 부재로 인한 에러 시 재시도
    if (error && error.code === '42703') {
      console.warn('[useStock] ai_result column missing in daily_stocks, retrying without it...')
      const fallbackQuery = client
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
        .eq('game_date', targetDate as any)
      
      const retry = await fallbackQuery
      data = retry.data
      error = retry.error
    }
    
    // Fallback: If no future data, fetch latest available stock data
    if (!error && (!data || data.length === 0)) {
      console.log(`[useStock] No daily stocks found for ${targetDate}, fetching latest available...`)
      const { data: latestDateData } = await client
        .from('daily_stocks')
        .select('game_date')
        .order('game_date', { ascending: false })
        .limit(1)
      
      const latestDateItem = (latestDateData as any)?.[0]
      if (latestDateItem && latestDateItem.game_date) {
        const latestDate = latestDateItem.game_date
        console.log(`[useStock] Found latest available date: ${latestDate}`)
        
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
        
        let { data: fallbackData, error: fallbackError } = await q
        
        if (fallbackError && fallbackError.code === '42703') {
          const fbRetryQuery = client
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
            .eq('game_date', latestDate)
          const fbRetry = await fbRetryQuery
          fallbackData = fbRetry.data
          fallbackError = fbRetry.error
        }
        
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
          summary: decodeHtmlEntities(d.llm_summary)
        }))
    }

    // 2) Fallback: 당일 데이터가 없을 경우 최신 뉴스 기반 요약 노출
    const { data, error } = await client
      .from('news')
      .select(`
        ai_score,
        llm_summary,
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
      .order('published_at', { ascending: false })
      .limit(10)
    
    if (error) return []
    return (data || [])
      .filter((n: any) => n.stocks && !isEtf(n.stocks.name))
      .map((n: any) => ({
        id: Number(n.stocks.id),
        name: n.stocks.name,
        code: n.stocks.code,
        last_price: n.stocks.last_price || 0,
        change_amount: n.stocks.change_amount || 0,
        change_rate: n.stocks.change_rate || 0,
        ai_recommendation_count: n.stocks.ai_recommendation_count || 0,
        ai_win_count: n.stocks.ai_win_count || 0,
        ai_processed_count: n.stocks.ai_processed_count || 0,
        ai_score: n.ai_score || 0,
        summary: decodeHtmlEntities(n.llm_summary)
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
  })

  const dailyStocks = computed(() => {
    return stocks.value || []
  })

  const hearts = useState<number[]>('wishlist', () => [])
  const wishlistGroups = useState<WishlistGroup[]>('wishlistGroups', () => [])
  const wishlistsWithGroups = useState<WishlistItem[]>('wishlistsWithGroups', () => [])
  const myPredictions = useState<{ stockId: number, prediction: 'up' | 'down', result?: 'win' | 'lose' | 'draw' | 'pending' }[]>('myPredictions', () => [])
  const participantCount = useState<number>('participantCount', () => 0)
  const totalMemberCount = useState<number>('totalMemberCount', () => 0)
  const isWishlistFetching = useState<boolean>('isWishlistFetching', () => false)
  const isGuideOpen = useState<boolean>('isGuideOpen', () => false)
  
  // 참여 완료 여부 (현재 활성화된 리그 기준)
  const allPredicted = computed(() => {
    if (!dailyStocks.value || dailyStocks.value.length === 0) return false
    // myPredictions가 현재 표시된 종목들을 모두 포함하는지 확인
    return dailyStocks.value.every(s => myPredictions.value.some(p => p.stockId === s.id))
  })

  // 4. League Status (Closed after 08:00 KST, Open after 21:20 KST)
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

  // 5. Result Status (Published after 20:30 KST)
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

  const refreshAll = async () => {
    await refresh()
    const targetDate = dailyStocks.value?.[0]?.game_date
    await Promise.all([
      fetchPredictions(targetDate),
      fetchParticipantCount(targetDate),
      fetchWishlist()
    ])
  }

  const fetchParticipantCount = async (date?: string) => {
    // 1. 전체 회원 수 (total profiles count) - 항상 최신 상태로 유지
    const { count, error: countError } = await client
      .from('profiles')
      .select('*', { count: 'exact', head: true })
    
    if (!countError && count !== null) {
      totalMemberCount.value = count
    }

    let targetDate = date
    if (!targetDate) {
      if (stocks.value && (stocks.value as any).length > 0) {
        targetDate = (stocks.value as any)[0].game_date
      } else {
        targetDate = getActiveLeagueDate()
      }
    }

    if (!targetDate) {
      console.log('[useStock] Skipping participant count RPC: No target date available')
      return
    }

    // 2. 해당 날짜 참여자 수 (unique user_ids who made predictions for that game_date)
    // RLS 정책 때문에 직접 조회 시 본인 데이터만 보이므로 RPC를 사용하여 전체 카운트 조회
    const { data, error } = await (client.rpc as any)('get_participant_count', { p_game_date: targetDate })
    
    if (error) {
      console.error('[useStock] Error fetching participant count via RPC:', error)
    }

    if (!error && data !== null) {
      participantCount.value = Number(data)
      console.log(`[useStock] Participant count for ${targetDate}: ${participantCount.value}, Total members: ${totalMemberCount.value}`)
    }
  }

  const fetchWishlistGroups = async () => {
    const userId = await resolveUserId()
    if (!userId) return

    const { data, error } = await client
      .from('wishlist_groups')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })

    if (!error && data) {
      wishlistGroups.value = data as any
      console.log('[useStock] Wishlist groups fetched:', wishlistGroups.value)
    }
    
    if (error) {
      console.error('[useStock] fetchWishlistGroups error:', error)
    }
  }

  const createWishlistGroup = async (name: string) => {
    const userId = await resolveUserId()
    if (!userId) {
      toast.add({
        title: '로그인이 필요합니다',
        color: 'warning'
      })
      return { success: false }
    }

    const { data, error } = await client
      .from('wishlist_groups')
      .insert({ user_id: userId, name, sort_order: wishlistGroups.value.length } as any)
      .select()
      .single()

    if (!error && data) {
      wishlistGroups.value = [...wishlistGroups.value, data as any]
      toast.add({
        title: '새 폴더가 생성되었어요',
        color: 'primary',
        icon: 'i-heroicons-folder-plus'
      })
      return { success: true, data: data as any }
    }

    if (error) {
      console.error('[useStock] createWishlistGroup error:', error)
      toast.add({
        title: '폴더 생성에 실패했습니다',
        description: error?.message || '알 수 없는 오류가 발생했습니다.',
        color: 'error',
        icon: 'i-heroicons-exclamation-circle'
      })
    }
    return { success: false, error }
  }

  const deleteWishlistGroup = async (groupId: number) => {
    const userId = await resolveUserId()
    if (!userId) return { success: false }
    
    const { error } = await client
      .from('wishlist_groups')
      .delete()
      .eq('id', groupId)

    if (!error) {
      wishlistGroups.value = wishlistGroups.value.filter(g => g.id !== groupId)
      wishlistsWithGroups.value = wishlistsWithGroups.value.filter(w => w.group_id !== groupId)
      hearts.value = [...new Set(wishlistsWithGroups.value.map(w => w.stock_id))]
      
      toast.add({
        title: '폴더를 삭제했습니다',
        color: 'neutral',
        icon: 'i-heroicons-trash'
      })
      return { success: true }
    }

    console.error('[useStock] deleteWishlistGroup error:', error)
    toast.add({
      title: '폴더 삭제에 실패했습니다',
      description: error?.message || '알 수 없는 오류가 발생했습니다.',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle'
    })
    return { success: false, error }
  }

  const updateWishlistGroup = async (groupId: number, name: string) => {
    const userId = await resolveUserId()
    if (!userId) return { success: false }
    
    const { error } = await client
      .from('wishlist_groups')
      .update({ name } as any)
      .eq('id', groupId)

    if (!error) {
      const idx = wishlistGroups.value.findIndex(g => g.id === groupId)
      if (idx > -1) wishlistGroups.value[idx].name = name
      toast.add({
        title: '폴더 이름을 변경했습니다',
        color: 'primary',
        icon: 'i-heroicons-pencil-square'
      })
      return { success: true }
    }

    console.error('[useStock] updateWishlistGroup error:', error)
    toast.add({
      title: '폴더 이름 변경에 실패했습니다',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle'
    })
    return { success: false, error }
  }

  const fetchWishlist = async () => {
    const userId = await resolveUserId()
    if (!userId) {
      console.log('[useStock] Skipping fetchWishlist: No user logged in')
      hearts.value = []
      wishlistsWithGroups.value = []
      return
    }

    if (isWishlistFetching.value) {
      console.log('[useStock] fetchWishlist already in progress, skipping...')
      return
    }

    isWishlistFetching.value = true
    try {
      // 1. 그룹 목록 먼저 가져오기
      await fetchWishlistGroups()

      // 만약 그룹이 하나도 없다면 (트리거 실패 등의 경우), 기본 폴더 하나 생성 시도
      if (wishlistGroups.value.length === 0) {
        console.warn('[useStock] No wishlist groups found, attempting to create default...')
        const result = await createWishlistGroup('기본 폴더')
        if (!result.success) {
          console.error('[useStock] Failed to create default wishlist group:', result.error)
        }
      }

      // 2. 위시리스트 데이터 가져오기
      const { data, error } = await client.from('wishlists').select('stock_id, group_id').eq('user_id', userId)
      
      if (!error && data) {
        wishlistsWithGroups.value = data.map((w: any) => ({
          stock_id: Number(w.stock_id),
          group_id: w.group_id ? Number(w.group_id) : null // null 허용 (이전 버전 호환성)
        }))
        hearts.value = [...new Set(wishlistsWithGroups.value.map(w => w.stock_id))]
        console.log('[useStock] Wishlist fetched:', wishlistsWithGroups.value)
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
    
    const stocksMap = (data || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      code: s.code,
      last_price: s.last_price || 0,
      change_amount: s.change_amount || 0,
      change_rate: s.change_rate || 0,
      ai_recommendation_count: s.ai_recommendation_count || 0,
      ai_win_count: s.ai_win_count || 0,
      ai_processed_count: s.ai_processed_count || 0,
      summary: decodeHtmlEntities(s.summary || '')
    }))

    return stocksMap.map(s => {
      const groups = wishlistsWithGroups.value
        .filter(w => w.stock_id === Number(s.id))
        .map(w => w.group_id)
      return { ...s, group_ids: groups }
    })
  }, { watch: [hearts, wishlistsWithGroups] })

  const toggleHeart = async (stockId: number, groupId?: number) => {
    const userId = await resolveUserId()
    if (!userId) {
      if (process.client) {
        toast.add({
          title: '로그인이 필요합니다',
          description: '관심 종목 기능을 이용하려면 로그인해 주세요.',
          color: 'warning',
          icon: 'i-heroicons-user'
        })
        if (confirm('로그인이 필요한 기능입니다.\n로그인 페이지로 이동할까요?')) {
          navigateTo('/login')
        }
      }
      return
    }

    const id = Number(stockId)
    if (isNaN(id)) return

    // groupId가 undefined인 경우에만 기본 폴더를 찾음. null은 '폴더 없음'으로 명시적 처리.
    let targetGroupId = groupId
    if (targetGroupId === undefined) {
      if (wishlistGroups.value.length === 0) {
        await fetchWishlistGroups()
      }
      targetGroupId = wishlistGroups.value[0]?.id || null
    }

    const itemIdx = wishlistsWithGroups.value.findIndex(w => w.stock_id === id && w.group_id === targetGroupId)
    const isCurrentlyHeartedInGroup = itemIdx > -1
    
    const previousWishlists = [...wishlistsWithGroups.value]

    // 1. 낙관적 업데이트
    if (isCurrentlyHeartedInGroup) {
      wishlistsWithGroups.value = wishlistsWithGroups.value.filter((_, i) => i !== itemIdx)
    } else {
      wishlistsWithGroups.value = [...wishlistsWithGroups.value, { stock_id: id, group_id: targetGroupId }]
    }
    hearts.value = [...new Set(wishlistsWithGroups.value.map(w => w.stock_id))]

    try {
      if (isCurrentlyHeartedInGroup) {
        let query = client.from('wishlists').delete().eq('user_id', userId).eq('stock_id', id)
        
        if (targetGroupId === null) {
          query = query.is('group_id', null)
        } else {
          query = query.eq('group_id', targetGroupId)
        }
        
        const { error } = await query
        if (error) throw error
        
        toast.add({
          title: '관심 종목 폴더에서 제거했어요',
          color: 'neutral',
          icon: 'i-heroicons-heart'
        })
      } else {
        const payload: any = { user_id: userId, stock_id: id, group_id: targetGroupId }
        
        const { error } = await client
          .from('wishlists')
          .insert(payload)
        
        if (error && error.code !== '23505') throw error
        
        toast.add({
          title: '관심 종목 폴더에 추가했어요',
          color: 'primary',
          icon: 'i-heroicons-heart-20-solid'
        })
      }
      
      await fetchWishlist()
      
    } catch (err: any) {
      console.error('[useStock] toggleHeart fallback! error:', err.message || err)
      wishlistsWithGroups.value = previousWishlists
      hearts.value = [...new Set(wishlistsWithGroups.value.map(w => w.stock_id))]
      
      toast.add({
        title: '찜 상태 변경에 실패했어요',
        color: 'error',
        icon: 'i-heroicons-exclamation-triangle'
      })
    }
  }

  // 사용자 상태 감시 (클라이언트 측에서만 1회 실행 유도)
  if (process.client) {
    watch(user, async (newUser, oldUser) => {
      // 실제 유저 아이디가 변경된 경우에만 동기화
      if (newUser?.id && newUser.id !== oldUser?.id) {
        console.log('[useStock] User session changed, syncing data...')
        await Promise.all([
          fetchWishlist(),
          fetchPredictions()
        ])
      } else if (!newUser && oldUser) {
        console.log('[useStock] User logged out, clearing data')
        hearts.value = []
        myPredictions.value = []
      }
    }, { immediate: true })
  }

  const predict = async (stockId: number, prediction: 'up' | 'down', gameDate?: string) => {
    // 0. 리그 종목 여부 검증 (사용자가 임의로 다른 종목을 예측하지 못하도록 제한)
    const isLeagueStock = dailyStocks.value.some(s => Number(s.id) === Number(stockId))
    if (!isLeagueStock) {
      alert('오늘의 리그 종목이 아닙니다.')
      return false
    }

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
      
      // 참여자 수 갱신
      await fetchParticipantCount(targetDate)
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
        full_name,
        display_name_type,
        avatar_url,
        gender,
        points,
        rankings(prediction_count, win_rate, win_count)
      `)
    
    // global all_time 랭킹의 경우 기본은 points 정렬
    if (sortBy === 'rank') {
      query = query.order('points', { ascending: false })
    }
    
    let { data, error } = await query.limit(limitNum)
    
    // gender 컬럼이 없을 경우 재시도
    if (error && error.code === '42703') {
      console.warn('[useStock] gender column missing, retrying without it...')
      const fallbackQuery = client
        .from('profiles')
        .select(`
          username,
          avatar_url,
          points,
          rankings(prediction_count, win_rate, win_count)
        `)
      
      if (sortBy === 'rank') {
        fallbackQuery.order('points', { ascending: false })
      }
      
      const retry = await fallbackQuery.limit(limitNum)
      data = retry.data
      error = retry.error
    }
    
    if (error) {
      console.error('Error fetching rankings:', error)
      return []
    }

    let results = ((data as any[]) || []).map((p) => {
      const stats = (p.rankings as any[])?.find(r => r.ranking_type === 'all_time' && r.period_key === 'global') || { prediction_count: 0, win_rate: 0, win_count: 0 }
      return {
        username: p.username,
        full_name: p.full_name,
        display_name_type: p.display_name_type,
        displayName: p.display_name_type === 'full_name' ? (p.full_name || p.username) : p.username,
        avatar_url: p.avatar_url,
        gender: p.gender,
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
    let { data: profile, error: profileError } = await client
      .from('profiles')
      .select('username, full_name, display_name_type, email, avatar_url, points, role, gender')
      .eq('id', userId)
      .single()

    // 컬럼 부재로 인한 에러 시 재시도 (gender 또는 role 제외)
    if (profileError && profileError.code === '42703') {
      console.warn('[useStock] Some columns missing in profiles, retrying with basic columns...')
      const retry = await client
        .from('profiles')
        .select('username, email, avatar_url, points')
        .eq('id', userId)
        .single()
      profile = retry.data
      profileError = retry.error
    }

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
      fullName: (profile as any)?.full_name,
      displayNameType: (profile as any)?.display_name_type || 'nickname',
      displayName: (profile as any)?.display_name_type === 'full_name' ? ((profile as any)?.full_name || (profile as any)?.username) : (profile as any)?.username,
      email: (profile as any)?.email,
      avatarUrl: (profile as any)?.avatar_url,
      points: (profile as any)?.points || 0,
      role: (profile as any)?.role || 'user',
      gender: (profile as any)?.gender,
      rank,
      winRate,
      totalGames,
      streak
    }
  }

  const updateProfile = async (updates: { username?: string, fullName?: string, gender?: string | null, avatarUrl?: string | null, displayNameType?: 'nickname' | 'full_name' }) => {
    const userId = await resolveUserId()
    if (!userId) return { success: false, message: '로그인이 필요합니다.' }

    const { username, fullName, gender, avatarUrl, displayNameType } = updates
    const queryData: any = {}
    if (username !== undefined) queryData.username = username
    if (fullName !== undefined) queryData.full_name = fullName
    if (gender !== undefined) queryData.gender = gender
    if (avatarUrl !== undefined) queryData.avatar_url = avatarUrl
    if (displayNameType !== undefined) queryData.display_name_type = displayNameType

    const { error } = await (client
      .from('profiles') as any)
      .update(queryData)
      .eq('id', userId)

    if (error) {
      console.error('Error updating profile:', error)
      return { success: false, message: '프로필 수정에 실패했습니다.' }
    }
    return { success: true }
  }

  const fetchUserHistory = async (page = 1, pageSize = 20) => {
    const userId = await resolveUserId()
    if (!userId) return []

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const { data, error } = await client
      .from('predictions')
      .select(`
        id,
        game_date,
        prediction_type,
        result,
        points_awarded,
        stocks (
          name,
          code
        )
      `)
      .eq('user_id', userId)
      .order('game_date', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('Error fetching history:', error)
      return []
    }

    // 리그 종목인 것만 필터링 (사용자 피드백 반영)
    // 1. result가 pending인데 game_date가 과거인 경우 제외
    // 2. 오늘 날짜(game_date === today)인데 결과 발표 시간(20:30)이 지났는데도 pending인 경우 제외 (리그 종목이라면 결과가 나왔어야 함)
    const today = getKstDate()
    const { timeVal } = getKstHourMinute()
    
    return (data || [])
      .filter((p: any) => {
        if (p.result === 'pending') {
          if (p.game_date < today) return false
          if (p.game_date === today && timeVal >= 2030) return false
        }
        return true
      })
      .map((p: any) => ({
      id: p.id,
      game_date: p.game_date,
      prediction_type: p.prediction_type,
      result: p.result,
      points_awarded: p.points_awarded,
      stockName: (p.stocks as any)?.name || '알 수 없는 종목',
      stockCode: (p.stocks as any)?.code || ''
    }))
  }

  const fetchStocksWithStats = async (
    orderBy: 'market_cap_rank' | 'wishlist_count' | 'win_count' | 'ai_recommendation_count' | 'volume' = 'market_cap_rank',
    page = 1,
    pageSize = 10,
    searchQuery = '',
    onlyHearted = false,
    market: 'KOSPI' | 'KOSDAQ' | 'ALL' = 'ALL'
  ) => {
    try {
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      // 1. 모든 종목 정보 (페이징 및 검색 적용)
      let query = client
        .from('stocks')
        .select('id, name, code, last_price, change_amount, change_rate, market_cap_rank, summary, wishlist_count, win_count, ai_recommendation_count, ai_win_count, ai_processed_count, volume', { count: 'exact' })

      if (searchQuery.trim()) {
        const q = searchQuery.trim()
        query = query.or(`name.ilike.%${q}%,code.ilike.%${q}%`)
      }

      if (onlyHearted) {
        if (hearts.value.length > 0) {
          query = query.in('id', hearts.value)
        } else {
          return { data: [], count: 0 }
        }
      }

      if (market && market !== 'ALL') {
        query = query.eq('sector', market)
      }

      let finalQuery = query.order(orderBy, { ascending: orderBy === 'market_cap_rank' })
      
      // 찜순(wishlist_count), 예측성공 순(win_count) 등에서 중복 시 시가총액 순(market_cap_rank asc)으로 2차 정렬
      if (orderBy !== 'market_cap_rank') {
        finalQuery = finalQuery.order('market_cap_rank', { ascending: true })
      }

      const { data: stocksData, error: stocksError, count } = await finalQuery
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

        if (onlyHearted) {
          if (hearts.value.length > 0) {
            fallbackQuery = fallbackQuery.in('id', hearts.value)
          } else {
            return { data: [], count: 0 }
          }
        }

        if (market && market !== 'ALL') {
          fallbackQuery = fallbackQuery.eq('sector', market)
        }

        const fallbackOrderBy = orderBy === 'market_cap_rank' ? 'market_cap_rank' : 'market_cap_rank'
        const { data: fallbackData, error: fallbackError, count: fallbackCount } = await fallbackQuery
          .order(fallbackOrderBy, { ascending: true })
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
            summary: decodeHtmlEntities(s.summary || ''),
            wishlist_count: 0,
            win_count: 0,
            ai_recommendation_count: 0,
            ai_win_count: 0,
            ai_processed_count: 0
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
          summary: decodeHtmlEntities(s.summary || ''),
          wishlist_count: s.wishlist_count || 0,
          win_count: s.win_count || 0,
          ai_recommendation_count: s.ai_recommendation_count || 0,
          ai_win_count: s.ai_win_count || 0,
          ai_processed_count: s.ai_processed_count || 0,
          volume: s.volume || 0
        })),
        count: count || 0
      }
    } catch (err: any) {
      console.error('[useStock] Unexpected error in fetchStocksWithStats:', err.message)
      return { data: [], count: 0 }
    }
  }
  const fetchNews = async (pageSize = 20, page = 1, type?: string, stockId?: number) => {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = client
      .from('news')
      .select(`
        id,
        title,
        content,
        url,
        source,
        published_at,
        llm_summary,
        ai_score,
        type,
        stocks (
          id,
          name,
          code
        )
      `, { count: 'exact' })
    
    if (stockId) {
      query = query.eq('stock_id', stockId)
    }

    if (type && type !== 'all') {
      query = query.eq('type', type)
    } else {
      query = query.neq('type', 'notice')
    }

    const { data, error, count } = await query
      .order('published_at', { ascending: false })
      .range(from, to)
    
    if (error) {
      console.error('Error fetching news:', error)
      return { data: [], count: 0 }
    }

    return {
      data: (data || []).map((n: any) => ({
        id: n.id,
        title: decodeHtmlEntities(n.title),
        content: n.content,
        url: n.url,
        source: n.source,
        published_at: n.published_at,
        llm_summary: decodeHtmlEntities(n.llm_summary),
        type: n.type || 'news',
        stockId: (n.stocks as any)?.id ? Number((n.stocks as any).id) : null,
        stockName: (n.stocks as any)?.name,
        stockCode: (n.stocks as any)?.code
      })),
      count: count || 0
    }
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

  const fetchStockByCode = async (code: string) => {
    const { data, error } = await client
      .from('stocks')
      .select('id, name, code, last_price, change_amount, change_rate, market_cap_rank, summary, sector, wishlist_count, win_count, ai_recommendation_count, ai_win_count, ai_processed_count')
      .eq('code', code)
      .maybeSingle()
    
    if (error) {
      console.error('Error fetching stock by code:', error)
      return null
    }
    return data
  }

  const fetchPriceHistory = async (stockId: number, days = 30) => {
    const { data, error } = await client
      .from('stock_price_history')
      .select('*')
      .eq('stock_id', stockId)
      .order('price_date', { ascending: false })
      .limit(days)
    
    if (error) {
      console.error('Error fetching price history:', error)
      return []
    }
    return data
  }

  const fetchGlobalAiStats = async () => {
    const { data, error } = await client
      .from('stocks')
      .select('ai_win_count, ai_processed_count')
    
    if (error) return { totalWins: 0, totalProcessed: 0 }
    
    const totalWins = (data as any[]).reduce((sum, s) => sum + (s.ai_win_count || 0), 0)
    const totalProcessed = (data as any[]).reduce((sum, s) => sum + (s.ai_processed_count || 0), 0)
    
    return { totalWins, totalProcessed }
  }
  
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
    
    let historyPrices: any[] = []
    if (stockIds.length > 0 && gameDates.length > 0) {
      // 모든 추천 항목의 기준가(전일 종가)를 찾기 위해 넉넉하게 최근 60일치 시세를 가져옵니다.
      // (주말/공휴일 등을 고려하여 추천일보다 이전인 데이터를 매칭하기 위함)
      const minDate = new Date(Math.min(...gameDates.map((d: string) => new Date(d).getTime())))
      const searchStartDate = new Date(minDate)
      searchStartDate.setDate(searchStartDate.getDate() - 10) // 최소 10일 전부터 조회
      const searchStartDateStr = searchStartDate.toISOString().split('T')[0]

      const { data: hpData } = await client
        .from('stock_price_history')
        .select('stock_id, price_date, close_price')
        .in('stock_id', stockIds)
        .gte('price_date', searchStartDateStr)
        .order('price_date', { ascending: false })
      historyPrices = hpData || []
    }

    const todayStr = getKstDate()
    const todayNum = new Date(todayStr).getTime()

    const items = (data || []).filter((ds: any) => ds.stocks).map((ds: any) => {
      // 추천 기준가(rec_price) 결정 로직: 
      // game_date보다 이전 날짜 중 가장 최신 시세를 찾습니다. (이것이 추천 전일 종가)
      const recPriceRecord = historyPrices.find(hp => 
        Number(hp.stock_id) === Number(ds.stocks.id) && hp.price_date < ds.game_date
      )
      
      // 만약 이전 시세가 없다면(신규 상장 등), 해당 날짜의 시세라도 찾아보고 그것도 없으면 현재가를 임시로 사용
      const sameDayRecord = historyPrices.find(hp => 
        Number(hp.stock_id) === Number(ds.stocks.id) && hp.price_date === ds.game_date
      )
      
      const recPrice = recPriceRecord?.close_price || sameDayRecord?.close_price || ds.stocks.last_price || 0
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

    if (items.length > 0) {
      return { items, emptyReason: null as const }
    }

    if ((data || []).length > 0) {
      return { items: [], emptyReason: 'join_missing' as const }
    }

    return { items: [], emptyReason: 'no_data' as const }
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
    fetchStockByCode,
    fetchPriceHistory,
    fetchGlobalAiStats,
    toggleHeart,
    predict,
    fetchRankings,
    fetchUserStats,
    fetchUserHistory,
    fetchStocksWithStats,
    isLeagueOpen,
    isResultPublished,
    isGuideOpen,
    allPredicted,
    refreshAll,
    fetchAiHistory,
    isHearted: (id: number) => hearts.value.includes(Number(id)),
    getPrediction: (id: number) => myPredictions.value.find(p => p.stockId === id) || null,
    getPredictionValue: (id: number) => myPredictions.value.find(p => p.stockId === id)?.prediction || null,
    updateProfile,
    wishlistGroups,
    wishlistsWithGroups,
    fetchWishlistGroups,
    createWishlistGroup,
    deleteWishlistGroup,
    updateWishlistGroup,
    fetchEconomicIndicators: async () => {
      const { data, error } = await client
        .from('economic_indicators')
        .select('*')
        .order('event_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching economic indicators:', error)
        return []
      }
      return data || []
    },
    notifications: computed(() => {
      const items: any[] = []
      
      // 1. 추천 종목 추가
      if (recommended.value) {
        recommended.value.forEach((s: any) => {
          items.push({
            id: `rec-${s.id}`,
            type: 'recommendation',
            title: s.name,
            summary: s.summary,
            date: new Date().toISOString(),
            code: s.code,
            importance: 3
          })
        })
      }
      
      // 2. 경제 지표 추가 (중요도 3점 & 실제치 발표 완료)
      const indicators = useState<any[]>('recent_indicators', () => [])
      if (indicators.value) {
        indicators.value
          .filter(idx => idx.importance >= 3 && idx.actual && idx.actual !== '발표전')
          .forEach((idx: any) => {
            items.push({
              id: `ind-${idx.id}`,
              type: 'indicator',
              title: idx.event_name,
              summary: `${idx.country === 'US' ? '🇺🇸' : '🇰🇷'} 지표 발표: ${idx.actual} (예측: ${idx.forecast || '-'})`,
              date: idx.event_at,
              importance: idx.importance
            })
          })
      }
      
      return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10)
    }),
    reEvaluateRecommendation: async (dailyId: number) => {
      try {
        const { data, error } = await client.functions.invoke('re-evaluate-recommendation', {
          body: { daily_stock_id: dailyId }
        })
        if (error) throw error
        return { success: true, data }
      } catch (err: any) {
        console.error('[useStock] Re-evaluation failed:', err.message)
        return { success: false, message: err.message }
      }
    },
    withdrawRecommendation: async (dailyId: number) => {
      const { error } = await client
        .from('daily_stocks')
        .update({ status: 'withdrawn' } as any)
        .eq('id', dailyId)
      
      if (error) {
        console.error('[useStock] Withdrawal failed:', error.message)
        return { success: false, message: error.message }
      }
      return { success: true }
    }
  }
}
