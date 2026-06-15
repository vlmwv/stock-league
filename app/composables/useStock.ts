import { repairNewsUrl, decodeHtmlEntities, isEtf } from '~/utils/stock'
import { loadRecPriceHistory, resolveRecPrice } from '~/utils/stockHistory'

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
  last_recommendation_date?: string
  market_cap?: number
  rec_price?: number
  prediction_count?: number
  lose_count?: number
  win_rate?: number
}

export const useStock = () => {
  const { client, user, toast, resolveUserId } = useStockClient()

  const { getKstDate, getKstHourMinute, getActiveLeagueDate, kstTime } = useKstTime()

  // 실시간 상태 업데이트를 위한 시간 Ref 갱신 (30초마다). 21:20 경과 시 내일 종목 자동 새로고침.
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
      console.error('[useStock] fetchTargetedStocks error:', error)
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

  // 관심 종목(찜) 도메인 — 분리된 useWishlist 사용. 내부 참조용으로 hearts/fetchWishlist만 구조분해.
  const wishlist = useWishlist()
  const { hearts, fetchWishlist } = wishlist
  const myPredictions = useState<{ stockId: number, prediction: 'up' | 'down', result?: 'win' | 'lose' | 'draw' | 'pending' }[]>('myPredictions', () => [])
  const participantCount = useState<number>('participantCount', () => 0)
  const totalMemberCount = useState<number>('totalMemberCount', () => 0)
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
    await Promise.all([refresh(), refreshRecommended()])
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

  const currentUserProfile = useState<any | null>('current_user_profile', () => null)

  const fetchUserStats = async () => {
    const userId = await resolveUserId()
    if (!userId) {
      console.log('[useStock] Skipping fetchUserStats: No valid userId')
      return null
    }

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

    // 2. Get all-time rank (number of users with more points + 1)
    const { count: higherRankCount } = await client
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gt('points', (profile as any)?.points || 0)

    const allTimeRank = (higherRankCount || 0) + 1

    // 2.5 Get current monthly rank
    const kstDate = getKstDate() // "YYYY-MM-DD"
    const periodKey = kstDate.substring(0, 7) // "YYYY-MM"
    const { data: monthlyRankData } = await client
      .from('rankings')
      .select('rank, win_rate, prediction_count, win_count')
      .eq('user_id', userId)
      .eq('ranking_type', 'monthly')
      .eq('period_key', periodKey)
      .maybeSingle()
    
    const monthlyRank = (monthlyRankData as any)?.rank || null
    // Use monthly rank as primary, fallback to all-time if no monthly data yet
    const rank = monthlyRank || allTimeRank

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

    const stats = {
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
      allTimeRank,
      monthlyStats: monthlyRankData ? {
        rank: (monthlyRankData as any).rank,
        winRate: (monthlyRankData as any).win_rate,
        predictionCount: (monthlyRankData as any).prediction_count,
        winCount: (monthlyRankData as any).win_count
      } : null,
      winRate,
      totalGames,
      streak
    }
    
    currentUserProfile.value = stats
    return stats
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

    // 성공 시 전역 상태 즉시 갱신
    await fetchUserStats()
    
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


  // 분리된 독립 도메인 컴포저블 (파사드로 합쳐 내보낸다)
  const rankings = useRankings()
  const directory = useStockDirectory(hearts)
  const aiHistory = useAiHistory()
  const news = useNews()
  const recoAdmin = useRecommendationAdmin()

  return {
    ...rankings,
    ...directory,
    ...aiHistory,
    ...news,
    ...recoAdmin,
    ...wishlist,
    dailyStocks,
    recommendedStocks: recommended,
    marketCapStocks,
    myPredictions,
    currentUserProfile,
    participantCount,
    totalMemberCount,
    refresh,
    fetchError,
    fetchPredictions,
    refreshMarketCap,
    refreshRecommended,
    fetchParticipantCount,
    predict,
    fetchUserStats,
    fetchUserHistory,
    isLeagueOpen,
    isResultPublished,
    isGuideOpen,
    allPredicted,
    refreshAll,
    getPrediction: (id: number) => myPredictions.value.find(p => p.stockId === id) || null,
    getPredictionValue: (id: number) => myPredictions.value.find(p => p.stockId === id)?.prediction || null,
    updateProfile,
    notifications: computed(() => {
      const items: any[] = []
      const todayKst = getKstDate() // "YYYY-MM-DD"
      
      // 1. 추천 종목 추가 (오늘 게임 날짜 종목만)
      if (recommended.value) {
        recommended.value.forEach((s: any) => {
          // created_at이 있으면 그 시간을, 없으면 오늘 날짜 00:00으로 fallback
          const notifDate = s.created_at || `${todayKst}T00:00:00.000Z`
          items.push({
            id: `rec-${s.id}`,
            type: 'recommendation',
            title: s.name,
            summary: s.summary,
            date: notifDate,
            code: s.code,
            importance: 3
          })
        })
      }
      
      // 2. 경제 지표 추가 (중요도 3점 & 발표 완료 & 최근 24시간 이내)
      const indicators = useState<any[]>('recent_indicators', () => [])
      if (indicators.value) {
        const now = new Date()
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        
        indicators.value
          .filter(idx => {
            const eventDate = new Date(idx.event_at)
            // 1. 중요도 3점 이상
            // 2. 연설 제외
            // 3. 최근 24시간 이내 이벤트
            // 4. 이미 시간이 지났거나 실제치가 있는 경우 (발표 완료)
            if (idx.importance < 3) return false
            if (idx.event_name?.includes('연설')) return false
            if (eventDate < oneDayAgo || eventDate > now) {
              // 실제치가 있으면 보여줌 (시간이 약간 안 맞더라도)
              if (!(idx.actual && idx.actual !== '발표전' && eventDate >= oneDayAgo)) return false
            }
            return true
          })
          .forEach((idx: any) => {
            const actualVal = idx.actual && idx.actual !== '발표전' ? idx.actual : '발표됨'
            items.push({
              id: `ind-${idx.id}`,
              type: 'indicator',
              title: idx.event_name,
              summary: `${idx.country === 'US' ? '🇺🇸' : '🇰🇷'} 지표 발표: ${actualVal} (예측: ${idx.forecast || '-'})`,
              date: idx.event_at,
              importance: idx.importance
            })
          })
      }
      
      return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10)
    }),
    targetedStocks,
    refreshTargetedStocks,
    pendingTargeted,
  }
}
