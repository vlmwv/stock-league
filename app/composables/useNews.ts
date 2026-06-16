import { decodeHtmlEntities } from '~/utils/stock'

// 뉴스/공시, 테마, 경제 지표 조회 + 알림(notifications) 집계.
// notifications는 daily 추천(recommended)에 의존하므로 해당 ref를 주입받는다.
export const useNews = (recommended: Ref<any[] | undefined>) => {
  const { client } = useStockClient()
  const { getKstDate } = useKstTime()

  const themes = useState<any[]>('themes_list', () => [])
  const isThemesLoading = useState<boolean>('is_themes_loading', () => false)

  const fetchThemes = async () => {
    isThemesLoading.value = true
    try {
      const data = await $fetch<any[]>('/api/stocks/themes')
      themes.value = data || []
      return themes.value
    } catch (err) {
      console.error('[useNews] Failed to fetch themes:', err)
      return []
    } finally {
      isThemesLoading.value = false
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

  const fetchEconomicIndicators = async () => {
    const { data, error } = await client
      .from('economic_indicators')
      .select('*')
      .order('event_at', { ascending: false })

    if (error) {
      console.error('Error fetching economic indicators:', error)
      return []
    }
    return data || []
  }

  // 추천 종목 + 경제 지표를 합친 알림 목록 (TopHeader 소비)
  const notifications = computed(() => {
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
  })

  return { themes, isThemesLoading, fetchThemes, fetchNews, fetchEconomicIndicators, notifications }
}
