// usePredictions: 예측 제출/조회(myPredictions)와 참여자 수(participantCount/totalMemberCount) 도메인.
// predict는 리그 종목 여부·오픈 여부 검증을 위해 useDailyStocks 결과(daily)를 주입받는다.
export const usePredictions = (daily: ReturnType<typeof useDailyStocks>) => {
  const { client, toast, resolveUserId, confirmLoginRedirect } = useStockClient()
  const { getKstDate, getActiveLeagueDate } = useKstTime()
  const { stocks, dailyStocks, isLeagueOpen } = daily

  const myPredictions = useState<{ stockId: number, prediction: 'up' | 'down', result?: 'win' | 'lose' | 'draw' | 'pending' }[]>('myPredictions', () => [])
  const participantCount = useState<number>('participantCount', () => 0)
  const totalMemberCount = useState<number>('totalMemberCount', () => 0)

  const fetchPredictions = async (date?: string) => {
    const userId = await resolveUserId()
    if (!userId) {
      console.log('[usePredictions] Skipping fetchPredictions: No user logged in')
      myPredictions.value = []
      return
    }

    // 인자로 받은 날짜가 있으면 사용, 없으면 오늘 날짜 사용
    const targetDate = date || getKstDate()

    console.log(`[usePredictions] Fetching predictions for date: ${targetDate}`)
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
      console.log('[usePredictions] Skipping participant count RPC: No target date available')
      return
    }

    // 2. 해당 날짜 참여자 수 (unique user_ids who made predictions for that game_date)
    // RLS 정책 때문에 직접 조회 시 본인 데이터만 보이므로 RPC를 사용하여 전체 카운트 조회
    const { data, error } = await (client.rpc as any)('get_participant_count', { p_game_date: targetDate })

    if (error) {
      console.error('[usePredictions] Error fetching participant count via RPC:', error)
    }

    if (!error && data !== null) {
      participantCount.value = Number(data)
      console.log(`[usePredictions] Participant count for ${targetDate}: ${participantCount.value}, Total members: ${totalMemberCount.value}`)
    }
  }

  const predict = async (stockId: number, prediction: 'up' | 'down', gameDate?: string) => {
    // 0. 리그 종목 여부 검증 (사용자가 임의로 다른 종목을 예측하지 못하도록 제한)
    const isLeagueStock = dailyStocks.value.some(s => Number(s.id) === Number(stockId))
    if (!isLeagueStock) {
      toast.add({ title: '오늘의 리그 종목이 아닙니다.', color: 'warning', icon: 'i-heroicons-exclamation-triangle' })
      return false
    }

    if (!isLeagueOpen.value) {
      toast.add({ title: '오늘의 예측은 08:00에 마감되었습니다.', color: 'warning', icon: 'i-heroicons-clock' })
      return false
    }

    const userId = await resolveUserId()
    if (!userId) {
      confirmLoginRedirect()
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
      // 저장은 서버 API만 수행한다 — predictions 테이블은 클라이언트 쓰기 권한이 없고,
      // 접수 시간·리그 종목·game_date를 서버가 다시 검증한다(usePredictions의 위 가드는 즉시 피드백용).
      const { data: sessionData } = await client.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) {
        throw new Error('세션이 만료되었어요. 다시 로그인해 주세요.')
      }

      const saved = await $fetch<{ game_date: string }>('/api/predictions/submit', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: { stock_id: stockId, prediction_type: prediction }
      })

      // 참여자 수 갱신
      await fetchParticipantCount(saved?.game_date || targetDate)
      return true
    } catch (err: any) {
      const message = err?.data?.statusMessage || err?.statusMessage || err?.message
      console.error('[usePredictions] Prediction failed:', message || err)
      // 2. 에러 시 원래 상태로 복구 (Rollback)
      myPredictions.value = previousPredictions

      toast.add({
        title: '예측 저장에 실패했어요',
        description: message || '잠시 후 다시 시도해 주세요.',
        color: 'error',
        icon: 'i-heroicons-exclamation-triangle'
      })
      return false
    }
  }

  return {
    myPredictions,
    participantCount,
    totalMemberCount,
    fetchPredictions,
    fetchParticipantCount,
    predict,
    getPrediction: (id: number) => myPredictions.value.find(p => p.stockId === id) || null,
    getPredictionValue: (id: number) => myPredictions.value.find(p => p.stockId === id)?.prediction || null,
  }
}
