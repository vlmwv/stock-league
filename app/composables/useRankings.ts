// 전체(역대) 랭킹 조회 및 공동 순위(Competition Ranking) 계산.
export const useRankings = () => {
  const { client } = useStockClient()

  const fetchRankings = async (limitNum = 100, sortBy: 'win_rate' | 'prediction_count' | 'win_count' | 'rank' = 'rank') => {
    let query = client
      .from('profiles')
      .select(`
        id,
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

    const { data, error } = await query.limit(limitNum)

    if (error) {
      console.error('Error fetching rankings:', error)
      return []
    }

    const results = ((data as any[]) || []).map((p) => {
      const stats = (p.rankings as any[])?.find(r => r.ranking_type === 'all_time' && r.period_key === 'global') || { prediction_count: 0, win_rate: 0, win_count: 0 }
      return {
        user_id: p.id,
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

    // 공동 순위(Competition Ranking) 계산
    let lastValue = -1
    let lastRank = 0
    return results.map((r, i) => {
      const currentValue = sortBy === 'win_rate' ? r.win_rate :
                         sortBy === 'prediction_count' ? r.prediction_count :
                         sortBy === 'win_count' ? r.win_count : r.points

      if (currentValue !== lastValue) {
        lastRank = i + 1
        lastValue = currentValue
      }
      return { ...r, rank: lastRank }
    })
  }

  return { fetchRankings }
}
