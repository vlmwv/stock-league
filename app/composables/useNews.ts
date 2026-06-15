import { decodeHtmlEntities } from '~/utils/stock'

// 뉴스/공시, 테마, 경제 지표 조회.
// 참고: 추천+경제지표를 합친 notifications computed는 daily 추천(recommended)에 의존하므로
// useStock 파사드에 남겨둔다.
export const useNews = () => {
  const { client } = useStockClient()

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

  return { themes, isThemesLoading, fetchThemes, fetchNews, fetchEconomicIndicators }
}
