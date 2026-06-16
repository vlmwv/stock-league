// useStock: 도메인 컴포저블들을 합쳐 내보내는 파사드.
// 오늘의 종목/추천/찜/예측/프로필/랭킹/뉴스/AI이력은 각 use* 컴포저블로 분리되어 있으며,
// 여기서는 도메인을 가로지르는 오케스트레이션(refreshAll·watch(user)·allPredicted)만 담당한다.
export const useStock = () => {
  const { user } = useStockClient()

  // 오늘의 종목/추천/시총/타겟가 + 리그 상태 + 자동 새로고침 (분리된 useDailyStocks)
  const daily = useDailyStocks()
  const {
    refresh, fetchError,
    recommended, refreshRecommended,
    marketCapStocks, refreshMarketCap,
    targetedStocks, refreshTargetedStocks, pendingTargeted,
    dailyStocks, isLeagueOpen, isResultPublished
  } = daily

  // 관심 종목(찜) 도메인 — 분리된 useWishlist 사용. 내부 참조용으로 hearts/fetchWishlist만 구조분해.
  const wishlist = useWishlist()
  const { hearts, fetchWishlist } = wishlist

  // 예측/참여자 수 도메인 — 분리된 usePredictions 사용(daily 주입). 내부 참조용으로 일부만 구조분해.
  const predictions = usePredictions(daily)
  const { myPredictions, fetchPredictions, fetchParticipantCount } = predictions

  const isGuideOpen = useState<boolean>('isGuideOpen', () => false)

  // 참여 완료 여부 (현재 활성화된 리그 기준)
  const allPredicted = computed(() => {
    if (!dailyStocks.value || dailyStocks.value.length === 0) return false
    // myPredictions가 현재 표시된 종목들을 모두 포함하는지 확인
    return dailyStocks.value.every(s => myPredictions.value.some(p => p.stockId === s.id))
  })

  const refreshAll = async () => {
    await Promise.all([refresh(), refreshRecommended()])
    const targetDate = dailyStocks.value?.[0]?.game_date
    await Promise.all([
      fetchPredictions(targetDate),
      fetchParticipantCount(targetDate),
      fetchWishlist()
    ])
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

  // 분리된 독립 도메인 컴포저블 (파사드로 합쳐 내보낸다)
  const rankings = useRankings()
  const directory = useStockDirectory(hearts)
  const aiHistory = useAiHistory()
  const news = useNews(recommended)
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
    ...predictions,
    dailyStocks,
    recommendedStocks: recommended,
    marketCapStocks,
    refresh,
    fetchError,
    refreshMarketCap,
    refreshRecommended,
    isLeagueOpen,
    isResultPublished,
    isGuideOpen,
    allPredicted,
    refreshAll,
    targetedStocks,
    refreshTargetedStocks,
    pendingTargeted,
  }
}
