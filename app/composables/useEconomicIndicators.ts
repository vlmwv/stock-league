// useEconomicIndicators: info.vue '경제 지표' 탭의 지표 목록·필터.
// 조회(fetchEconomicIndicators)는 useStock/useNews가 담당하므로 주입받고,
// 발표완료/예정 필터링과 탭 상태만 여기서 관리한다.
export const useEconomicIndicators = (
  fetchEconomicIndicators: () => Promise<any[]>
) => {
  const indicators = ref<any[]>([])
  const isLoadingIndicators = ref(false)
  const indicatorTab = ref<'upcoming' | 'announced'>('announced')

  const announcedIndicators = computed(() => {
    const now = new Date()
    return indicators.value
      .filter(item => {
        const isAnnounced = new Date(item.event_at) <= now || item.actual !== null
        const isHighImportance = item.importance === 3
        const isNotSpeech = !item.event_name?.includes('연설')
        return isAnnounced && isHighImportance && isNotSpeech
      })
      .sort((a, b) => new Date(b.event_at).getTime() - new Date(a.event_at).getTime())
  })

  const upcomingIndicators = computed(() => {
    const now = new Date()
    return indicators.value
      .filter(item => {
        const isUpcoming = new Date(item.event_at) > now && item.actual === null
        const isHighImportance = item.importance === 3
        const isNotSpeech = !item.event_name?.includes('연설')
        return isUpcoming && isHighImportance && isNotSpeech
      })
      .sort((a, b) => new Date(a.event_at).getTime() - new Date(b.event_at).getTime())
  })

  const loadIndicators = async () => {
    try {
      isLoadingIndicators.value = true
      indicators.value = await fetchEconomicIndicators()
    } catch (error) {
      console.error('Failed to load indicators:', error)
    } finally {
      isLoadingIndicators.value = false
    }
  }

  return { indicators, isLoadingIndicators, indicatorTab, announcedIndicators, upcomingIndicators, loadIndicators }
}
