// useAiCalendar: AI 추천 성과 달력(RankingAiCalendar.vue)의 상태와 그리드 계산을 담당한다.
// 월별 추천 이력(useStock.fetchAiHistoryMonthly)을 조회해 7열 달력 셀 배열로 가공한다.
// 셀 배경색 등 순수 뷰 헬퍼는 컴포넌트가 계속 담당한다.

export interface AiCalendarCell {
  day: number | null
  dateStr: string | null
  isCurrentMonth: boolean
  items: any[]
  summaryInfo: {
    theme: string
    repStockName: string
    repStockRate: number
    totalCount: number
    winCount: number
  } | null
  holidayName: string | null
}

export const useAiCalendar = () => {
  const { fetchAiHistoryMonthly } = useStock()

  // 달력 상태 관리
  const today = new Date()
  const currentYear = ref(today.getFullYear())
  const currentMonth = ref(today.getMonth() + 1) // 1-indexed

  const loading = ref(true)
  const monthlyHistory = ref<any[]>([])

  // 선택된 날짜 상세 패널 상태
  const activeDateCell = ref<AiCalendarCell | null>(null)

  // 오늘 날짜 문자열 (YYYY-MM-DD)
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  // 연도 옵션 계산 (2024년 ~ 현재 + 2년)
  const yearOptions = computed(() => {
    const startYear = 2024
    const endYear = today.getFullYear() + 2
    const options = []
    for (let y = startYear; y <= endYear; y++) {
      options.push(y)
    }
    return options
  })

  // 날짜별 데이터 그룹화
  const historyByDate = computed(() => {
    const map = new Map<string, any[]>()
    monthlyHistory.value.forEach(item => {
      const existing = map.get(item.game_date)
      if (existing) {
        existing.push(item)
      } else {
        map.set(item.game_date, [item])
      }
    })
    return map
  })

  // 달력 그리드 일자 계산
  const calendarCells = computed<AiCalendarCell[]>(() => {
    const year = currentYear.value
    const month = currentMonth.value

    // 해당 월 1일의 요일 (0: 일요일, ..., 6: 토요일)
    const firstDayOfWeek = new Date(year, month - 1, 1).getDay()
    // 해당 월의 총 일수
    const daysInMonth = new Date(year, month, 0).getDate()

    const cells: AiCalendarCell[] = []

    // 1일 시작 전 빈 칸 채우기
    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push({ day: null, dateStr: null, isCurrentMonth: false, items: [], summaryInfo: null, holidayName: null })
    }

    // 해당 월의 날짜 채우기
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const dayItems = historyByDate.value.get(dateStr) || []

      let summaryInfo = null
      if (dayItems.length > 0) {
        // 1) 대표 테마: 첫 번째 종목 혹은 ai_score가 가장 높은 종목의 섹터(sector)
        const sortedByScore = [...dayItems].sort((a, b) => b.ai_score - a.ai_score)
        const repStock = sortedByScore[0]
        const theme = repStock.sector && repStock.sector !== '-' ? repStock.sector : '개별이슈'

        // 2) 대표 종목명 및 누적 수익률 (수익률이 가장 우수하거나 AI 점수가 높은 종목)
        const repStockName = repStock.name
        const repStockRate = repStock.cumulative_change_rate

        // 3) 승률 통계 (ai_result === 'win' 이거나 누적 수익률이 양수인 경우 승리로 처리)
        const totalCount = dayItems.length
        const winCount = dayItems.filter(item => item.ai_result === 'win' || item.cumulative_change_rate > 0).length

        summaryInfo = {
          theme,
          repStockName,
          repStockRate,
          totalCount,
          winCount
        }
      }

      // 한국 공휴일 정보 획득
      const holidayName = getHolidayName(dateStr)

      cells.push({
        day: d,
        dateStr,
        isCurrentMonth: true,
        items: dayItems,
        summaryInfo,
        holidayName
      })
    }

    // 7열 맞추기 위해 뒷부분 빈 칸 채우기
    const totalCells = Math.ceil(cells.length / 7) * 7
    const fillCount = totalCells - cells.length
    for (let i = 0; i < fillCount; i++) {
      cells.push({ day: null, dateStr: null, isCurrentMonth: false, items: [], summaryInfo: null, holidayName: null })
    }

    return cells
  })

  // 데이터가 들어있는 오늘 또는 가장 빠른 셀 기본 선택
  const selectDefaultCell = () => {
    if (calendarCells.value && calendarCells.value.length > 0) {
      const todayCell = calendarCells.value.find(c => c.dateStr === todayStr && c.summaryInfo)
      if (todayCell) {
        activeDateCell.value = todayCell
        return
      }
      const dataCell = calendarCells.value.find(c => c.summaryInfo)
      if (dataCell) {
        activeDateCell.value = dataCell
      } else {
        activeDateCell.value = null
      }
    }
  }

  // 월간 데이터를 비동기로 로드
  const loadMonthlyData = async () => {
    loading.value = true
    try {
      const data = await fetchAiHistoryMonthly(currentYear.value, currentMonth.value)
      monthlyHistory.value = data
      // 데이터 로드 완료 후 기본 셀 선택
      setTimeout(selectDefaultCell, 50)
    } catch (error) {
      console.error('[RankingAiCalendar] Failed to load monthly AI history:', error)
    } finally {
      loading.value = false
    }
  }

  const goToday = () => {
    currentYear.value = today.getFullYear()
    currentMonth.value = today.getMonth() + 1
    loadMonthlyData()
  }

  const handleCellClick = (cell: AiCalendarCell) => {
    if (!cell.summaryInfo) return
    activeDateCell.value = cell
  }

  return {
    currentYear,
    currentMonth,
    loading,
    yearOptions,
    calendarCells,
    activeDateCell,
    todayStr,
    loadMonthlyData,
    goToday,
    handleCellClick
  }
}
