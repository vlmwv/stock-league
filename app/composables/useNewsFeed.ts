// useNewsFeed: info.vue '최신 뉴스' 탭의 페이지네이션 피드.
// 실제 조회(fetchNews)는 useStock/useNews가 담당하므로 주입받고, 여기서는 페이징/누적 상태만 관리한다.
export const useNewsFeed = (
  fetchNews: (pageSize: number, page: number, type: string) => Promise<any>
) => {
  const newsItems = ref<any[]>([])
  const isLoading = ref(true)
  const totalCount = ref(0)

  // 페이징 상태
  const page = ref(1)
  const pageSize = 20
  const hasMore = ref(true)
  const isFetchingMore = ref(false)

  const loadNews = async (isAppend = false) => {
    try {
      if (!isAppend) {
        isLoading.value = true
        page.value = 1
        hasMore.value = true
      } else {
        isFetchingMore.value = true
      }

      const response = await fetchNews(pageSize, page.value, 'all')
      const data = response.data || []
      totalCount.value = response.count || 0

      if (isAppend) {
        newsItems.value = [...newsItems.value, ...data]
      } else {
        newsItems.value = data
      }

      if (data.length < pageSize) {
        hasMore.value = false
      }
    } catch (error) {
      console.error('Failed to load news:', error)
    } finally {
      isLoading.value = false
      isFetchingMore.value = false
    }
  }

  const loadMore = () => {
    if (!hasMore.value || isFetchingMore.value || isLoading.value) return
    page.value++
    loadNews(true)
  }

  const navigateToNews = (item: any) => {
    const url = repairNewsUrl(item.url, item.stockCode)
    if (url) {
      window.open(url, '_blank')
    }
  }

  return { newsItems, isLoading, totalCount, hasMore, isFetchingMore, loadNews, loadMore, navigateToNews }
}
