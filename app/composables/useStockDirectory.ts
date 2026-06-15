import { decodeHtmlEntities } from '~/utils/stock'

// 종목 디렉토리: 통계 포함 목록(검색/정렬/페이징/관심 폴더 필터), 단건 조회, 시세 이력, 전역 AI 통계.
// 관심 폴더 필터(onlyHearted)를 위해 wishlist의 hearts 상태를 주입받는다.
export const useStockDirectory = (hearts: Ref<number[]>) => {
  const { client } = useStockClient()

  const fetchStocksWithStats = async (
    orderBy: 'market_cap_rank' | 'wishlist_count' | 'win_count' | 'ai_recommendation_count' | 'volume' | 'last_recommendation_date' | 'win_rate' = 'market_cap_rank',
    page = 1,
    pageSize = 10,
    searchQuery = '',
    onlyHearted = false,
    market: 'KOSPI' | 'KOSDAQ' | 'ALL' = 'ALL',
    groupId: number | null = null
  ) => {
    try {
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      // 1. 모든 종목 정보 (페이징 및 검색 적용)
      let query = client
        .from('stocks')
        .select('id, name, code, last_price, change_amount, change_rate, market_cap_rank, summary, wishlist_count, win_count, lose_count, prediction_count, win_rate, ai_recommendation_count, ai_win_count, ai_processed_count, volume, last_recommendation_date, market_cap, market, sector', { count: 'exact' })

      if (searchQuery.trim()) {
        const q = searchQuery.trim()
        query = query.or(`name.ilike.%${q}%,code.ilike.%${q}%`)
      }

      // 관심 폴더 필터링
      if (onlyHearted) {
        let targetStockIds = hearts.value

        // 특정 그룹(폴더)이 지정된 경우 해당 그룹의 stock_id만 필터링
        if (groupId !== null) {
          const { data: wishlistData } = await client
            .from('wishlists')
            .select('stock_id')
            .eq('group_id', groupId)

          if (wishlistData) {
            targetStockIds = (wishlistData as any[]).map(w => Number(w.stock_id))
          } else {
            targetStockIds = []
          }
        }

        if (targetStockIds.length > 0) {
          query = query.in('id', targetStockIds)
        } else {
          return { data: [], count: 0 }
        }
      }

      if (market && market !== 'ALL') {
        query = query.eq('market', market)
      }

      let finalQuery = query.order(orderBy, {
        ascending: orderBy === 'market_cap_rank',
        nullsFirst: false
      })

      // 정답률 정렬 시 참여수가 많은 순서를 2차 정렬로 추가
      if (orderBy === 'win_rate') {
        finalQuery = finalQuery.order('win_count', { ascending: false, nullsFirst: false })
      }

      // AI 추천 횟수 정렬 시 최근 추천일을 2차 정렬로 추가
      if (orderBy === 'ai_recommendation_count') {
        finalQuery = finalQuery.order('last_recommendation_date', { ascending: false, nullsFirst: false })
      }

      // 최근 추천일 정렬 시 추천 횟수를 2차 정렬로 추가
      if (orderBy === 'last_recommendation_date') {
        finalQuery = finalQuery.order('ai_recommendation_count', { ascending: false, nullsFirst: false })
      }

      // 중복 시 시가총액 순(market_cap_rank asc)으로 최종 정렬
      if (orderBy !== 'market_cap_rank') {
        finalQuery = finalQuery.order('market_cap_rank', { ascending: true })
      }

      const { data: stocksData, error: stocksError, count } = await finalQuery
        .range(from, to)

      if (stocksError) {
        console.error('[useStockDirectory] Error fetching stocks with stats:', stocksError.message)

        // Fallback: wishlist_count, win_count가 없어서 실패했을 수 있으므로 기본 정보만 다시 시도
        console.log('[useStockDirectory] Attempting fallback fetch without stats columns...')
        let fallbackQuery = client
          .from('stocks')
          .select('id, name, code, last_price, change_amount, change_rate, market_cap_rank, summary, market, sector', { count: 'exact' })

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
          fallbackQuery = fallbackQuery.eq('market', market)
        }

        const fallbackOrderBy = orderBy === 'market_cap_rank' ? 'market_cap_rank' : 'market_cap_rank'
        const { data: fallbackData, error: fallbackError, count: fallbackCount } = await fallbackQuery
          .order(fallbackOrderBy, { ascending: true })
          .range(from, to)

        if (fallbackError) {
          console.error('[useStockDirectory] Fallback fetch also failed:', fallbackError.message)
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
            market: s.market || '',
            sector: s.sector || '',
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
          market: s.market || '',
          sector: s.sector || '',
          wishlist_count: s.wishlist_count || 0,
          win_count: s.win_count || 0,
          ai_recommendation_count: s.ai_recommendation_count || 0,
          ai_win_count: s.ai_win_count || 0,
          ai_processed_count: s.ai_processed_count || 0,
          volume: s.volume || 0,
          last_recommendation_date: s.last_recommendation_date,
          market_cap: s.market_cap || 0,
          prediction_count: s.prediction_count || 0,
          lose_count: s.lose_count || 0,
          win_rate: s.win_rate || 0
        })),
        count: count || 0
      }
    } catch (err: any) {
      console.error('[useStockDirectory] Unexpected error in fetchStocksWithStats:', err.message)
      return { data: [], count: 0 }
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
      .select('id, name, code, last_price, change_amount, change_rate, market_cap_rank, summary, sector, market, wishlist_count, win_count, ai_recommendation_count, ai_win_count, ai_processed_count, last_recommendation_date')
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

  return { fetchStocksWithStats, fetchStockById, fetchStockByCode, fetchPriceHistory, fetchGlobalAiStats }
}
