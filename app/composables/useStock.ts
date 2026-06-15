// useStock: 도메인 컴포저블들을 합쳐 내보내는 파사드.
// 오늘의 종목/추천/찜/예측/프로필/랭킹/뉴스/AI이력은 각 use* 컴포저블로 분리되어 있으며,
// 여기서는 도메인을 가로지르는 오케스트레이션(refreshAll·watch(user)·allPredicted·notifications)만 담당한다.
export const useStock = () => {
  const { client, user, toast, resolveUserId } = useStockClient()

  const { getKstDate, getActiveLeagueDate } = useKstTime()

  // 오늘의 종목/추천/시총/타겟가 + 리그 상태 + 자동 새로고침 (분리된 useDailyStocks)
  const daily = useDailyStocks()
  const {
    stocks, refresh, fetchError,
    recommended, refreshRecommended,
    marketCapStocks, refreshMarketCap,
    targetedStocks, refreshTargetedStocks, pendingTargeted,
    dailyStocks, isLeagueOpen, isResultPublished
  } = daily

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


  // 분리된 독립 도메인 컴포저블 (파사드로 합쳐 내보낸다)
  const rankings = useRankings()
  const directory = useStockDirectory(hearts)
  const aiHistory = useAiHistory()
  const news = useNews()
  const recoAdmin = useRecommendationAdmin()
  const profile = useUserProfile()

  return {
    ...rankings,
    ...directory,
    ...aiHistory,
    ...news,
    ...recoAdmin,
    ...wishlist,
    ...profile,
    dailyStocks,
    recommendedStocks: recommended,
    marketCapStocks,
    myPredictions,
    participantCount,
    totalMemberCount,
    refresh,
    fetchError,
    fetchPredictions,
    refreshMarketCap,
    refreshRecommended,
    fetchParticipantCount,
    predict,
    isLeagueOpen,
    isResultPublished,
    isGuideOpen,
    allPredicted,
    refreshAll,
    getPrediction: (id: number) => myPredictions.value.find(p => p.stockId === id) || null,
    getPredictionValue: (id: number) => myPredictions.value.find(p => p.stockId === id)?.prediction || null,
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
