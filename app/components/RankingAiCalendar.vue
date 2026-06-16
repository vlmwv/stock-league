<script setup lang="ts">
const router = useRouter()
const { fetchAiHistoryMonthly } = useStock()

// 달력 상태 관리
const today = new Date()
const currentYear = ref(today.getFullYear())
const currentMonth = ref(today.getMonth() + 1) // 1-indexed

const loading = ref(true)
const monthlyHistory = ref<any[]>([])

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

// 한국 주요 공휴일 정의 (2024년 ~ 2028년)
const KOREAN_HOLIDAYS: Record<string, string> = {
  // 2024년
  '2024-01-01': '신정',
  '2024-02-09': '설날 연휴',
  '2024-02-10': '설날',
  '2024-02-11': '설날 연휴',
  '2024-02-12': '대체공휴일',
  '2024-03-01': '삼일절',
  '2024-04-10': '총선일',
  '2024-05-05': '어린이날',
  '2024-05-06': '대체공휴일',
  '2024-05-15': '부처님오신날',
  '2024-06-06': '현충일',
  '2024-08-15': '광복절',
  '2024-09-16': '추석 연휴',
  '2024-09-17': '추석',
  '2024-09-18': '추석 연휴',
  '2024-10-03': '개천절',
  '2024-10-09': '한글날',
  '2024-12-25': '성탄절',

  // 2025년
  '2025-01-01': '신정',
  '2025-01-28': '설날 연휴',
  '2025-01-29': '설날',
  '2025-01-30': '설날 연휴',
  '2025-03-01': '삼일절',
  '2025-03-03': '대체공휴일',
  '2025-05-05': '어린이날/부처님오신날',
  '2025-05-06': '대체공휴일',
  '2025-06-06': '현충일',
  '2025-08-15': '광복절',
  '2025-10-03': '개천절',
  '2025-10-05': '추석 연휴',
  '2025-10-06': '추석/대체공휴일',
  '2025-10-07': '추석 연휴',
  '2025-10-08': '대체공휴일',
  '2025-10-09': '한글날',
  '2025-12-25': '성탄절',

  // 2026년
  '2026-01-01': '신정',
  '2026-02-16': '설날 연휴',
  '2026-02-17': '설날',
  '2026-02-18': '설날 연휴',
  '2026-03-01': '삼일절',
  '2026-03-02': '대체공휴일',
  '2026-05-05': '어린이날',
  '2026-05-24': '부처님오신날',
  '2026-05-25': '대체공휴일',
  '2026-06-06': '현충일',
  '2026-08-15': '광복절',
  '2026-08-17': '대체공휴일',
  '2026-09-24': '추석 연휴',
  '2026-09-25': '추석',
  '2026-09-26': '추석 연휴',
  '2026-10-03': '개천절',
  '2026-10-05': '대체공휴일',
  '2026-10-09': '한글날',
  '2026-12-25': '성탄절',

  // 2027년
  '2027-01-01': '신정',
  '2027-02-06': '설날 연휴',
  '2027-02-07': '설날',
  '2027-02-08': '설날 연휴',
  '2027-02-09': '대체공휴일',
  '2027-03-01': '삼일절',
  '2027-05-05': '어린이날',
  '2027-05-13': '부처님오신날',
  '2027-06-06': '현충일',
  '2027-06-07': '대체공휴일',
  '2027-08-15': '광복절',
  '2027-08-16': '대체공휴일',
  '2027-09-14': '추석 연휴',
  '2027-09-15': '추석',
  '2027-09-16': '추석 연휴',
  '2027-10-03': '개천절',
  '2027-10-04': '대체공휴일',
  '2027-10-09': '한글날',
  '2027-10-11': '대체공휴일',
  '2027-12-25': '성탄절',

  // 2028년
  '2028-01-01': '신정',
  '2028-01-26': '설날 연휴',
  '2028-01-27': '설날',
  '2028-01-28': '설날 연휴',
  '2028-03-01': '삼일절',
  '2028-05-02': '부처님오신날',
  '2028-05-05': '어린이날',
  '2028-06-06': '현충일',
  '2028-08-15': '광복절',
  '2028-10-02': '추석 연휴',
  '2028-10-03': '추석/개천절',
  '2028-10-04': '추석 연휴',
  '2028-10-05': '대체공휴일',
  '2028-10-09': '한글날',
  '2028-12-25': '성탄절'
}

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

// 달력 그리드 일자 계산
const calendarCells = computed(() => {
  const year = currentYear.value
  const month = currentMonth.value
  
  // 해당 월 1일의 요일 (0: 일요일, ..., 6: 토요일)
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay()
  // 해당 월의 총 일수
  const daysInMonth = new Date(year, month, 0).getDate()
  
  const cells: Array<{
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
  }> = []
  
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
    const holidayName = KOREAN_HOLIDAYS[dateStr] || null
    
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

const goToday = () => {
  currentYear.value = today.getFullYear()
  currentMonth.value = today.getMonth() + 1
  loadMonthlyData()
}

// 상세 정보 모달 제어
const detailModalOpen = ref(false)
const selectedCell = ref<any>(null)

// 선택된 날짜 상세 패널 상태
const activeDateCell = ref<any>(null)

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

const openDetailModal = (cell: any) => {
  if (!cell.summaryInfo) return
  selectedCell.value = cell
  detailModalOpen.value = true
}

const handleCellClick = (cell: any) => {
  if (!cell.summaryInfo) return
  activeDateCell.value = cell
}

// 오늘 날짜 문자열 (YYYY-MM-DD)
const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

// 주말 및 공휴일 여부 체크
const isWeekendOrHoliday = (cell: any) => {
  if (!cell.dateStr) return false
  const day = new Date(cell.dateStr).getDay()
  return day === 0 || day === 6 || !!cell.holidayName
}

// 수익률에 따른 카드 동적 클래스 반환
const getCellBgClass = (cell: any) => {
  if (!cell.day) return 'bg-slate-100/50 dark:bg-slate-950/20 opacity-30 pointer-events-none'
  
  if (isWeekendOrHoliday(cell)) {
    return 'bg-slate-100/70 dark:bg-slate-950/40 opacity-60 border-dashed border-slate-200 dark:border-white/5'
  }
  
  if (cell.summaryInfo) {
    const rate = cell.summaryInfo.repStockRate
    if (rate > 0) {
      return 'bg-gradient-to-br from-rose-50/90 via-rose-100/30 to-slate-50/50 dark:from-rose-500/10 dark:via-slate-900/40 dark:to-slate-900/10 border-rose-200 dark:border-rose-500/20 hover:border-rose-400 dark:hover:border-rose-500/40 hover:from-rose-100/50 dark:hover:from-rose-500/15 cursor-pointer shadow-[inset_0_1px_1px_rgba(244,63,94,0.05)]'
    } else if (rate < 0) {
      return 'bg-gradient-to-br from-indigo-50/90 via-indigo-100/30 to-slate-50/50 dark:from-indigo-500/10 dark:via-slate-900/40 dark:to-slate-900/10 border-indigo-200 dark:border-indigo-500/20 hover:border-indigo-400 dark:hover:border-indigo-500/40 hover:from-indigo-100/50 dark:hover:from-indigo-500/15 cursor-pointer shadow-[inset_0_1px_1px_rgba(99,102,241,0.05)]'
    } else {
      return 'bg-gradient-to-br from-slate-50 via-slate-100/30 to-slate-50 dark:from-slate-500/5 dark:via-slate-900/40 dark:to-slate-900/10 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 cursor-pointer'
    }
  }
  
  return 'bg-white/90 dark:bg-slate-900/15 border-slate-200/60 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-slate-900/25'
}

onMounted(() => {
  loadMonthlyData()
})
</script>

<template>
  <div class="animate-fade-in space-y-6">
    <!-- 달력 헤더부 -->
    <div class="flex items-center justify-between bg-white/80 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-3xl p-5 backdrop-blur-md">
      <!-- 년/월 선택 드롭다운 -->
      <div class="flex items-center gap-2">
        <div class="relative">
          <select 
            v-model="currentYear" 
            class="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-2xl pl-4 pr-9 py-2 text-sm font-black text-slate-700 dark:text-slate-200 appearance-none focus:outline-none focus:border-brand-primary/50 transition-colors cursor-pointer"
            @change="loadMonthlyData"
          >
            <option v-for="year in yearOptions" :key="year" :value="year">{{ year }}년</option>
          </select>
          <UIcon name="i-heroicons-chevron-down-20-solid" class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
        </div>

        <div class="relative">
          <select 
            v-model="currentMonth" 
            class="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-2xl pl-4 pr-9 py-2 text-sm font-black text-brand-primary appearance-none focus:outline-none focus:border-brand-primary/50 transition-colors cursor-pointer"
            @change="loadMonthlyData"
          >
            <option v-for="month in 12" :key="month" :value="month">{{ month }}월</option>
          </select>
          <UIcon name="i-heroicons-chevron-down-20-solid" class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-primary pointer-events-none" />
        </div>
      </div>

      <!-- 단일 초기화 버튼 -->
      <button 
        class="px-4 h-9 rounded-2xl bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 text-xs font-black text-slate-600 dark:text-slate-400 hover:text-brand-primary active:scale-95 transition-all flex items-center gap-1.5 shadow-sm"
        title="오늘 날짜로 초기화"
        @click="goToday"
      >
        <UIcon name="i-heroicons-arrow-path" class="w-3.5 h-3.5" />
        <span>초기화</span>
      </button>
    </div>

    <!-- 로딩 인디케이터 -->
    <div v-if="loading" class="text-center py-32 bg-slate-900/20 border border-white/5 rounded-[2.5rem] backdrop-blur-sm">
      <div class="inline-block w-8 h-8 border-4 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin mb-4"/>
      <p class="text-slate-500 font-bold text-sm">추천 데이터를 분석 중...</p>
    </div>

    <!-- 달력 본문 그리드 -->
    <div v-else class="bg-white/70 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl backdrop-blur-md">
      <!-- 요일 헤더 -->
      <div class="grid grid-cols-7 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200/80 dark:border-white/5 text-center py-4">
        <span class="text-xs font-black text-rose-500 tracking-wider">일</span>
        <span class="text-xs font-black text-slate-600 dark:text-slate-500 tracking-wider">월</span>
        <span class="text-xs font-black text-slate-600 dark:text-slate-500 tracking-wider">화</span>
        <span class="text-xs font-black text-slate-600 dark:text-slate-500 tracking-wider">수</span>
        <span class="text-xs font-black text-slate-600 dark:text-slate-500 tracking-wider">목</span>
        <span class="text-xs font-black text-slate-600 dark:text-slate-500 tracking-wider">금</span>
        <span class="text-xs font-black text-indigo-600 dark:text-indigo-400 tracking-wider">토</span>
      </div>

      <!-- 날짜 그리드 -->
      <div class="grid grid-cols-7 gap-2 p-3 bg-slate-100/50 dark:bg-slate-950/20">
        <div 
          v-for="(cell, index) in calendarCells" 
          :key="index"
          :class="[
            'min-h-[110px] p-2.5 flex flex-col justify-between transition-all duration-300 relative group border rounded-2xl overflow-hidden hover:scale-[1.02] hover:z-20 hover:shadow-2xl cursor-pointer',
            getCellBgClass(cell),
            activeDateCell?.dateStr === cell.dateStr ? 'ring-2 ring-brand-primary border-brand-primary dark:ring-2 dark:ring-brand-primary z-20 shadow-lg' : ''
          ]"
          @click="handleCellClick(cell)"
        >
          <!-- 날짜 숫자 및 공휴일 표시 -->
          <div class="flex justify-between items-center w-full gap-1">
            <!-- 공휴일 텍스트가 있으면 좌측에 표시 -->
            <span 
              v-if="cell.day && cell.holidayName" 
              class="text-[9px] font-black text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded tracking-tighter truncate max-w-[70%]"
              :title="cell.holidayName"
            >
              {{ cell.holidayName }}
            </span>
            <span v-else/>
            
            <span 
              v-if="cell.day" 
              class="text-xs font-black w-6 h-6 flex items-center justify-center rounded-full transition-all"
              :class="[
                cell.dateStr === todayStr ? 'bg-brand-primary text-slate-950 font-black shadow-[0_0_10px_rgba(242,180,46,0.4)]' : [
                  (cell.dateStr && new Date(cell.dateStr).getDay() === 0) || cell.holidayName ? 'text-rose-500 font-extrabold' : '',
                  cell.dateStr && new Date(cell.dateStr).getDay() === 6 && !cell.holidayName ? 'text-indigo-600 dark:text-indigo-400 font-extrabold' : '',
                  !(cell.dateStr && (new Date(cell.dateStr).getDay() === 0 || new Date(cell.dateStr).getDay() === 6)) && !cell.holidayName ? 'text-slate-700 dark:text-slate-400' : ''
                ]
              ]"
            >
              {{ cell.day }}
            </span>
          </div>

          <!-- 추천 요약 카드 (극도로 간소화된 모던 뱃지 - 잘림 0%) -->
          <div v-if="cell.summaryInfo" class="mt-2 w-full flex flex-col items-center gap-1.5 relative z-10">
            <!-- 대표 수익률 표시 (기호와 숫자만 깔끔하게) -->
            <span 
              class="text-[9.5px] font-black tracking-tight flex items-center gap-0.5 px-2 py-0.5 rounded-lg shadow-sm"
              :class="[
                cell.summaryInfo.repStockRate >= 0 
                  ? 'text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-500/10 border border-rose-200/50 dark:border-rose-500/20' 
                  : 'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-500/10 border border-indigo-200/50 dark:border-indigo-500/20'
              ]"
            >
              {{ cell.summaryInfo.repStockRate >= 0 ? '▲' : '▼' }}{{ Math.abs(cell.summaryInfo.repStockRate) }}%
            </span>

            <!-- 적중 현황 미니 인디케이터 -->
            <span class="text-[8.5px] font-extrabold text-slate-500 dark:text-slate-400 opacity-90">
              🎯 {{ cell.summaryInfo.winCount }}/{{ cell.summaryInfo.totalCount }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 선택된 날짜 상세 패널 (글씨 짤림 없는 시원하고 예쁜 뷰) -->
    <div 
      v-if="activeDateCell && activeDateCell.summaryInfo" 
      class="bg-white/90 dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-[2rem] p-5 shadow-xl backdrop-blur-md animate-fade-in space-y-4"
    >
      <div class="flex items-center justify-between border-b border-slate-200/60 dark:border-white/5 pb-3">
        <h4 class="text-sm font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <UIcon name="i-heroicons-calendar" class="w-4 h-4 text-brand-primary" />
          {{ activeDateCell.dateStr }} AI 추천 분석
        </h4>
        <span class="text-[10px] font-black text-brand-primary bg-brand-primary/10 border border-brand-primary/20 rounded-lg px-2.5 py-0.5">
          🎯 적중률 {{ Math.round((activeDateCell.summaryInfo.winCount / activeDateCell.summaryInfo.totalCount) * 100) }}%
        </span>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="space-y-1">
          <p class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">대표 테마</p>
          <p class="text-sm font-black text-slate-800 dark:text-slate-100">
            {{ activeDateCell.summaryInfo.theme }}
          </p>
        </div>
        <div class="space-y-1">
          <p class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">추천/적중 수</p>
          <p class="text-sm font-black text-slate-800 dark:text-slate-100">
            총 {{ activeDateCell.summaryInfo.totalCount }}개 중 <span class="text-rose-500 dark:text-rose-400 font-extrabold">{{ activeDateCell.summaryInfo.winCount }}개 적중</span>
          </p>
        </div>
      </div>

      <div class="bg-slate-50 dark:bg-slate-950/30 border border-slate-100 dark:border-white/5 rounded-2xl p-4 flex items-center justify-between gap-3">
        <div class="min-w-0">
          <p class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">대표 종목</p>
          <p class="text-sm font-black text-slate-800 dark:text-slate-200 truncate mt-0.5">
            {{ activeDateCell.summaryInfo.repStockName }}
          </p>
        </div>
        <div class="text-right flex-shrink-0">
          <span 
            class="text-xs font-black px-2.5 py-1 rounded-lg inline-flex items-center gap-0.5 shadow-sm"
            :class="[
              activeDateCell.summaryInfo.repStockRate >= 0 
                ? 'text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-500/10' 
                : 'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-500/10'
            ]"
          >
            {{ activeDateCell.summaryInfo.repStockRate >= 0 ? '▲' : '▼' }} {{ Math.abs(activeDateCell.summaryInfo.repStockRate) }}%
          </span>
        </div>
      </div>

      <!-- 상세 종목 전체보기 버튼 (클릭 시 기존 고화질 모달 오픈) -->
      <button 
        class="w-full h-12 rounded-2xl bg-brand-primary text-slate-950 font-black hover:bg-brand-primary/95 active:scale-[0.98] transition-all text-xs flex items-center justify-center gap-1.5 shadow animate-fade-in"
        @click="openDetailModal(activeDateCell)"
      >
        <UIcon name="i-heroicons-document-magnifying-glass" class="w-4 h-4" />
        <span>상세 분석 리포트 전체보기</span>
      </button>
    </div>

    <!-- 하단 헬퍼 가이드 -->
    <div class="text-center py-2 space-y-1">
      <p class="text-[10px] font-black text-slate-600 dark:text-slate-500 uppercase tracking-widest">
        날짜 클릭 → 하단 상세 정보 확인
      </p>
      <p class="text-[9.5px] text-slate-500 dark:text-slate-600 font-bold">
        ※ 퍼센테이지(%)는 해당 날짜 AI 추천 대표 종목의 누적 수익률을 의미합니다.
      </p>
    </div>

    <!-- S급추적 상세 모달 팝업 -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="detailModalOpen && selectedCell" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto">
          <!-- 배경 클릭 시 닫기 -->
          <div class="absolute inset-0" @click="detailModalOpen = false"/>
          
          <div class="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-3xl overflow-hidden transform transition-all duration-300 scale-100 max-h-[85vh] flex flex-col">
            
            <!-- 상단 헤더 -->
            <div class="px-6 pt-8 pb-4 border-b border-white/5 flex-shrink-0 flex items-center justify-between">
              <div>
                <h3 class="text-xl font-black text-white tracking-tight flex items-center gap-2">
                  <UIcon name="i-heroicons-calendar" class="w-5 h-5 text-brand-primary" />
                  {{ selectedCell.dateStr }} AI 추천 리포트
                </h3>
                <p class="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">
                  {{ selectedCell.items.length }}개 종목 분석 완료
                </p>
              </div>
              <button 
                class="w-8 h-8 rounded-full bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors flex items-center justify-center border border-white/5" 
                @click="detailModalOpen = false"
              >
                <UIcon name="i-heroicons-x-mark-20-solid" class="w-5 h-5" />
              </button>
            </div>

            <!-- 종목 정보 목록 스크롤 -->
            <div class="flex-1 overflow-y-auto px-6 py-4 space-y-4 no-scrollbar">
              <div 
                v-for="item in selectedCell.items" 
                :key="item.daily_id"
                class="glass-dark rounded-3xl p-5 border border-white/5 hover:bg-white/5 transition-all cursor-pointer group relative overflow-hidden flex flex-col gap-4"
                @click="router.push('/stocks/' + item.code); detailModalOpen = false"
              >
                <!-- 카드 배경 글로우 데코 -->
                <div 
                  class="absolute -top-12 -right-12 w-28 h-28 blur-3xl rounded-full opacity-10 group-hover:opacity-20 transition-all duration-500"
                  :class="item.cumulative_change_rate >= 0 ? 'bg-rose-500' : 'bg-indigo-500'"
                />

                <div class="relative z-10 flex flex-col gap-3.5">
                  <!-- 상단 주식 요약 -->
                  <div class="flex items-start justify-between">
                    <div>
                      <span class="text-[9px] font-black text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded border border-white/5 uppercase tracking-wider">
                        {{ item.sector || '테마 미분류' }}
                      </span>
                      <div class="flex items-baseline gap-1.5 mt-1.5">
                        <h4 class="text-base font-black text-slate-200 group-hover:text-brand-primary transition-colors leading-tight">
                          {{ item.name }}
                        </h4>
                        <span class="text-[10px] font-mono text-slate-500 font-bold uppercase tracking-tight">
                          {{ item.code }}
                        </span>
                      </div>
                    </div>
                    <div class="flex flex-col items-end gap-1.5">
                      <span class="text-[10px] font-black text-slate-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg">
                        AI 점수 {{ item.ai_score }}P
                      </span>
                    </div>
                  </div>

                  <!-- 가격 지표 비교 -->
                  <div class="grid grid-cols-3 gap-2 bg-slate-950/20 rounded-2xl p-3 border border-white/5 text-center">
                    <div class="space-y-0.5">
                      <p class="text-[9px] font-black text-slate-500 uppercase tracking-widest">추천가</p>
                      <p class="text-xs font-black text-slate-300 font-mono">{{ item.rec_price?.toLocaleString() }}원</p>
                    </div>
                    <div class="flex flex-col items-center justify-center">
                      <span 
                        class="text-[10px] font-black tracking-tight"
                        :class="item.cumulative_change_rate >= 0 ? 'text-rose-400' : 'text-indigo-400'"
                      >
                        {{ item.cumulative_change_rate >= 0 ? '+' : '' }}{{ item.cumulative_change_rate }}%
                      </span>
                      <p class="text-[8px] font-bold text-slate-600 mt-0.5 uppercase tracking-widest">수익률</p>
                    </div>
                    <div class="space-y-0.5">
                      <p class="text-[9px] font-black text-slate-500 uppercase tracking-widest">현재가</p>
                      <p class="text-xs font-black text-slate-200 font-mono">{{ item.last_price?.toLocaleString() }}원</p>
                    </div>
                  </div>

                  <!-- LLM 요약 -->
                  <p class="text-xs text-slate-400 leading-relaxed font-medium italic opacity-85">
                    "{{ item.summary || '상세 추천 요약이 존재하지 않습니다.' }}"
                  </p>
                </div>
              </div>
            </div>

            <!-- 하단 닫기 영역 -->
            <div class="px-6 py-6 border-t border-white/5 flex-shrink-0 bg-slate-900/50">
              <button 
                class="w-full h-13 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold active:scale-95 transition-all text-xs uppercase tracking-widest border border-white/5"
                @click="detailModalOpen = false"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.glass-dark {
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
.fade-enter-active .relative, .fade-leave-active .relative {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.fade-enter-from .relative, .fade-leave-to .relative {
  transform: scale(0.95);
}

.animate-fade-in {
  animation: fade-in 0.4s ease-out;
}
@keyframes fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
