// 사용자 프로필/통계: 프로필+랭크+승률+스트릭 집계(fetchUserStats), 프로필 수정(updateProfile),
// 예측 이력 페이징(fetchUserHistory). 전역 상태 currentUserProfile에 통계를 캐싱한다.
export const useUserProfile = () => {
  const { client, resolveUserId } = useStockClient()
  const { getKstDate, getKstHourMinute } = useKstTime()

  const currentUserProfile = useState<any | null>('current_user_profile', () => null)

  const fetchUserStats = async () => {
    const userId = await resolveUserId()
    if (!userId) {
      console.log('[useUserProfile] Skipping fetchUserStats: No valid userId')
      return null
    }

    let { data: profile, error: profileError } = await client
      .from('profiles')
      .select('username, full_name, display_name_type, email, avatar_url, points, role, gender')
      .eq('id', userId)
      .single()

    // 컬럼 부재로 인한 에러 시 재시도 (gender 또는 role 제외)
    if (profileError && profileError.code === '42703') {
      console.warn('[useUserProfile] Some columns missing in profiles, retrying with basic columns...')
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

  return { currentUserProfile, fetchUserStats, updateProfile, fetchUserHistory }
}
