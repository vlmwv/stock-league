// useStockList: 종목 목록 페이지(stocks/index.vue)의 검색·정렬·필터·페이지네이션.
// 실제 조회(fetchStocksWithStats)는 useStock/useStockDirectory가 담당하므로 주입받고,
// 정렬 탭 매핑·무한 스크롤 누적·필터 변경 감시를 여기서 관리한다.
export const useStockList = (
  fetchStocksWithStats: (...args: any[]) => Promise<any>
) => {
  const searchQuery = ref('')
  const currentSort = ref<'marketCap' | 'wishlist' | 'prediction' | 'aiRecommendation' | 'interested' | 'volume'>('marketCap')
  const currentMarket = ref<'ALL' | 'KOSPI' | 'KOSDAQ'>('ALL')
  const currentAiSort = ref<'count' | 'recent'>('count')
  const currentPredictionSort = ref<'count' | 'rate'>('count')
  const currentGroupId = ref<number | null>(null)
  const isLoading = ref(true)
  const allStocks = ref<any[]>([])

  // 페이징 상태
  const page = ref(1)
  const pageSize = 20
  const totalCount = ref(0)
  const hasMore = ref(true)
  const isFetchingMore = ref(false)

  const sortTabs = [
    { key: 'marketCap', label: '시가총액' },
    { key: 'volume', label: '거래총액' },
    { key: 'interested', label: '관심' },
    { key: 'wishlist', label: '찜 순' },
    { key: 'prediction', label: '예측 성공' },
    { key: 'aiRecommendation', label: 'AI 추천' }
  ] as const

  const marketTabs = [
    { key: 'ALL', label: '전체' },
    { key: 'KOSPI', label: '코스피' },
    { key: 'KOSDAQ', label: '코스닥' }
  ] as const

  const aiSortTabs = [
    { key: 'count', label: '추천 수' },
    { key: 'recent', label: '최근 순' }
  ] as const

  const predictionSortTabs = [
    { key: 'count', label: '성공 수 순' },
    { key: 'rate', label: '성공 률' }
  ] as const

  const loadStocks = async (isAppend = false) => {
    try {
      if (!isAppend) {
        isLoading.value = true
        page.value = 1
        hasMore.value = true
      } else {
        isFetchingMore.value = true
      }

      const sortMap: Record<string, 'market_cap_rank' | 'wishlist_count' | 'win_count' | 'ai_recommendation_count' | 'volume' | 'last_recommendation_date' | 'win_rate'> = {
        marketCap: 'market_cap_rank',
        interested: 'market_cap_rank', // 관심 탭도 시총순으로 정렬
        wishlist: 'wishlist_count',
        prediction: currentPredictionSort.value === 'count' ? 'win_count' : 'win_rate',
        aiRecommendation: currentAiSort.value === 'count' ? 'ai_recommendation_count' : 'last_recommendation_date',
        volume: 'volume'
      }

      const response = await fetchStocksWithStats(
        sortMap[currentSort.value],
        page.value,
        pageSize,
        searchQuery.value,
        currentSort.value === 'interested',
        currentMarket.value,
        currentGroupId.value // 그룹 ID 추가
      )

      const newData = response.data || []
      totalCount.value = response.count || 0

      if (isAppend) {
        allStocks.value = [...allStocks.value, ...newData]
      } else {
        allStocks.value = newData
      }

      // 더 가져올 데이터가 있는지 확인
      if (newData.length < pageSize || allStocks.value.length >= totalCount.value) {
        hasMore.value = false
      }
    } catch (err) {
      console.error('[Stocks] Failed to load stocks:', err)
    } finally {
      isLoading.value = false
      isFetchingMore.value = false
    }
  }

  const loadMore = () => {
    if (!hasMore.value || isFetchingMore.value || isLoading.value) return
    page.value++
    loadStocks(true)
  }

  const formatVolume = (vol: number | undefined) => {
    if (!vol) return '0'
    if (vol >= 1000000000000) { // 1조 이상
      return `${(vol / 1000000000000).toFixed(2)}조`
    }
    if (vol >= 100000000) { // 1억 이상
      return `${(vol / 100000000).toFixed(1)}억`
    }
    if (vol >= 10000) { // 1만 이상
      return `${(vol / 10000).toFixed(1)}만`
    }
    return vol.toLocaleString()
  }

  const formatMarketValue = (val: number | undefined) => {
    if (!val) return '0'
    // Naver API에서 가져온 값은 '억' 단위임
    if (val >= 10000) { // 1조 이상 (10,000억)
      return `${(val / 10000).toFixed(1)}조`
    }
    return `${val.toLocaleString()}억`
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)

    // KST 기준으로 오늘과 어제 계산
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())

    if (d.getTime() === today.getTime()) return '오늘'
    if (d.getTime() === yesterday.getTime()) return '어제'

    // 그 외에는 MM/DD 형식으로 반환 (Intl 사용으로 안전하게)
    return new Intl.DateTimeFormat('ko-KR', {
      month: '2-digit',
      day: '2-digit'
    }).format(date).replace('. ', '/').replace('.', '')
  }

  // 검색어 변경 감지 (Debounce)
  let searchTimeout: any = null
  watch(searchQuery, () => {
    if (searchTimeout) clearTimeout(searchTimeout)
    searchTimeout = setTimeout(() => {
      loadStocks()
    }, 400)
  })

  // 정렬 탭 변경 시 데이터 다시 불러오기
  watch(currentSort, () => {
    currentMarket.value = 'ALL'
    currentGroupId.value = null // 정렬 변경 시 그룹 필터 초기화
    loadStocks()
  })

  // 상세 필터 변경 시 데이터 다시 불러오기
  watch(currentMarket, () => {
    loadStocks()
  })

  // 관심 그룹 변경 시 데이터 다시 불러오기
  watch(currentGroupId, () => {
    loadStocks()
  })

  // AI 추천 상세 정렬 변경 시 데이터 다시 불러오기
  watch(currentAiSort, () => {
    loadStocks()
  })

  // 예측 성공 상세 정렬 변경 시 데이터 다시 불러오기
  watch(currentPredictionSort, () => {
    loadStocks()
  })

  return {
    searchQuery,
    currentSort,
    currentMarket,
    currentAiSort,
    currentPredictionSort,
    currentGroupId,
    isLoading,
    allStocks,
    page,
    pageSize,
    totalCount,
    hasMore,
    isFetchingMore,
    sortTabs,
    marketTabs,
    aiSortTabs,
    predictionSortTabs,
    loadStocks,
    loadMore,
    formatVolume,
    formatMarketValue,
    formatDate
  }
}
