// useAdminDashboard: 관리자 대시보드(admin/index.vue)의 데이터 계층.
// 배치 로그·시스템 통계·AI 성과 집계 조회와 그 파생 통계를 담당한다.
// 배치 실행/추천 재검증 같은 액션·모달 UI는 페이지가 계속 담당한다.
export const useAdminDashboard = () => {
  const supabase = useSupabaseClient()

  const pending = ref(false)
  const batchLogs = ref<any[]>([])
  const aiWindowDays = ref(90)
  const aiRows = ref<any[]>([])
  const detailedAiRows = ref<any[]>([])
  const systemStats = ref([
    { label: '전체 사용자', value: '0', icon: 'i-heroicons-users', gradient: 'from-blue-500 to-cyan-400' },
    { label: '오늘의 예측', value: '0', icon: 'i-heroicons-chart-bar', gradient: 'from-green-500 to-emerald-400' },
    { label: '활성 종목', value: '0', icon: 'i-heroicons-banknotes', gradient: 'from-orange-500 to-yellow-400' },
    { label: '최근 이슈', value: '0건', icon: 'i-heroicons-megaphone', gradient: 'from-purple-500 to-indigo-400' }
  ])

  const fetchLogs = async () => {
    const { data } = await supabase
      .from('batch_execution_logs')
      .select('*')
      .order('finished_at', { ascending: false })
      .limit(10)

    if (data) batchLogs.value = data
  }

  const getWindowStartDate = (days: number) => {
    if (days <= 0) return null
    const now = new Date()
    now.setDate(now.getDate() - days)
    return now.toISOString().slice(0, 10)
  }

  const fetchAiDashboard = async () => {
    let query = supabase
      .from('daily_stocks')
      .select('game_date, ai_score, ai_result, status')
      .eq('status', 'closed')
      .in('ai_result', ['win', 'lose', 'draw'])
      .order('game_date', { ascending: false })

    const startDate = getWindowStartDate(aiWindowDays.value)
    if (startDate) {
      query = query.gte('game_date', startDate)
    }

    const { data, error } = await query.limit(5000)
    if (error) {
      console.error('[admin] Failed to fetch AI dashboard data:', error.message)
      aiRows.value = []
      return
    }

    aiRows.value = data || []

    // 개별 상세 로그 조회 (최근 20개)
    const { data: detailed } = await supabase
      .from('daily_stocks')
      .select('*, stocks(name, code)')
      .order('game_date', { ascending: false })
      .order('ai_score', { ascending: false })
      .limit(20)

    detailedAiRows.value = detailed || []
  }

  const fetchStats = async () => {
    // 실제 통계 데이터 조회 로직 (예시)
    const [{ count: userCount }, { count: predCount }, { count: stockCount }, { count: newsCount }] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('predictions').select('*', { count: 'exact', head: true }),
      supabase.from('stocks').select('*', { count: 'exact', head: true }),
      supabase.from('news').select('*', { count: 'exact', head: true })
    ])

    systemStats.value[0]!.value = (userCount || 0).toLocaleString()
    systemStats.value[1]!.value = (predCount || 0).toLocaleString()
    systemStats.value[2]!.value = (stockCount || 0).toLocaleString()
    systemStats.value[3]!.value = (newsCount || 0).toLocaleString() + '건'
  }

  const aiSummary = computed(() => {
    const rows = aiRows.value
    const total = rows.length
    const wins = rows.filter(r => r.ai_result === 'win').length
    const loses = rows.filter(r => r.ai_result === 'lose').length
    const draws = rows.filter(r => r.ai_result === 'draw').length
    const winRate = total > 0 ? (wins / total) * 100 : 0
    return { total, wins, loses, draws, winRate }
  })

  const scoreBandRows = computed(() => {
    const bands = [
      { label: '0 ~ 39', min: 0, max: 39 },
      { label: '40 ~ 49', min: 40, max: 49 },
      { label: '50 ~ 59', min: 50, max: 59 },
      { label: '60 ~ 69', min: 60, max: 69 },
      { label: '70 ~ 100', min: 70, max: 100 }
    ]

    return bands.map((band) => {
      const bandRows = aiRows.value.filter((row) => {
        const score = Number(row.ai_score ?? 0)
        return score >= band.min && score <= band.max
      })
      const total = bandRows.length
      const wins = bandRows.filter(r => r.ai_result === 'win').length
      const winRate = total > 0 ? (wins / total) * 100 : 0
      return { label: band.label, total, wins, winRate }
    })
  })

  const dailyTrendRows = computed(() => {
    const grouped = new Map<string, { total: number, wins: number }>()
    for (const row of aiRows.value) {
      const key = row.game_date
      const prev = grouped.get(key) || { total: 0, wins: 0 }
      prev.total += 1
      if (row.ai_result === 'win') prev.wins += 1
      grouped.set(key, prev)
    }

    return Array.from(grouped.entries())
      .sort((a, b) => a[0] < b[0] ? 1 : -1)
      .slice(0, 10)
      .map(([gameDate, value]) => ({
        gameDate,
        total: value.total,
        wins: value.wins,
        winRate: value.total > 0 ? (value.wins / value.total) * 100 : 0
      }))
  })

  const refreshAll = async () => {
    pending.value = true
    await Promise.all([fetchLogs(), fetchStats(), fetchAiDashboard()])
    pending.value = false
  }

  // 조회 기간 변경 시 AI 성과 대시보드만 다시 조회
  watch(aiWindowDays, () => {
    fetchAiDashboard()
  })

  return {
    pending,
    batchLogs,
    aiWindowDays,
    detailedAiRows,
    systemStats,
    aiSummary,
    scoreBandRows,
    dailyTrendRows,
    fetchAiDashboard,
    refreshAll
  }
}
