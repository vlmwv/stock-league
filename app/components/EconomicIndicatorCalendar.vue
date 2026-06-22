<script setup lang="ts">
const { fetchEconomicIndicators } = useStock()

// 달력 상태 관리
const today = new Date()
const currentYear = ref(today.getFullYear())
const currentMonth = ref(today.getMonth() + 1) // 1-indexed
const loading = ref(true)
const indicators = ref<any[]>([])

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

// KST 날짜 포맷 (YYYY-MM-DD)
const getKstDateString = (dateInput: string | Date) => {
  const d = new Date(dateInput)
  // 타임존 보정을 위해 KST(UTC+9)로 변환
  const kstOffset = 9 * 60 * 60 * 1000
  const kstDate = new Date(d.getTime() + kstOffset)
  const yyyy = kstDate.getUTCFullYear()
  const mm = String(kstDate.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(kstDate.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

// 날짜별 데이터 그룹화
const indicatorsByDate = computed(() => {
  const map = new Map<string, any[]>()
  indicators.value.forEach(item => {
    // KST 기준으로 매핑
    const dateStr = getKstDateString(item.event_at)
    const existing = map.get(dateStr)
    if (existing) {
      existing.push(item)
    } else {
      map.set(dateStr, [item])
    }
  })
  return map
})

// 월간 데이터를 Supabase에서 로드
const loadIndicatorsData = async () => {
  loading.value = true
  try {
    const data = await fetchEconomicIndicators(currentYear.value, currentMonth.value)
    indicators.value = data
  } catch (error) {
    console.error('[EconomicIndicatorCalendar] Failed to load indicators:', error)
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
    holidayName: string | null
  }> = []
  
  // 1일 시작 전 빈 칸 채우기
  for (let i = 0; i < firstDayOfWeek; i++) {
    cells.push({ day: null, dateStr: null, isCurrentMonth: false, items: [], holidayName: null })
  }
  
  // 해당 월의 날짜 채우기
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const dayItems = indicatorsByDate.value.get(dateStr) || []
    const holidayName = KOREAN_HOLIDAYS[dateStr] || null
    
    cells.push({
      day: d,
      dateStr,
      isCurrentMonth: true,
      items: dayItems,
      holidayName
    })
  }
  
  // 7열 맞추기 위해 뒷부분 빈 칸 채우기
  const totalCells = Math.ceil(cells.length / 7) * 7
  const fillCount = totalCells - cells.length
  for (let i = 0; i < fillCount; i++) {
    cells.push({ day: null, dateStr: null, isCurrentMonth: false, items: [], holidayName: null })
  }
  
  return cells
})

const goToday = () => {
  currentYear.value = today.getFullYear()
  currentMonth.value = today.getMonth() + 1
  loadIndicatorsData()
}

// 오늘 날짜 문자열 (YYYY-MM-DD)
const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

// 주말 및 공휴일 여부 체크
const isWeekendOrHoliday = (cell: any) => {
  if (!cell.dateStr) return false
  const day = new Date(cell.dateStr).getDay()
  return day === 0 || day === 6 || !!cell.holidayName
}

// 셀 배경 클래스 반환
const getCellBgClass = (cell: any) => {
  if (!cell.day) return 'bg-slate-100/50 dark:bg-slate-950/20 opacity-30 pointer-events-none'
  
  if (isWeekendOrHoliday(cell)) {
    return 'bg-slate-100/70 dark:bg-slate-950/40 opacity-60 border-dashed border-slate-200 dark:border-white/5'
  }
  
  return 'bg-white/90 dark:bg-slate-900/15 border-slate-200/60 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-slate-900/25'
}

// 지표명 축약 규칙 적용
const shortenEventName = (name: string) => {
  if (!name) return ''
  // 1. 괄호 안의 대문자 약어 추출 (예: CPI, GDP, FOMC, PCE, PMI 등)
  const abbrMatch = name.match(/\(([A-Z]{3,5})\)/)
  if (abbrMatch && abbrMatch[1]) {
    return abbrMatch[1]
  }
  
  // 2. 국가명 축약 및 불필요 수식어 필터링
  let cleanName = name
    .replace(/국 매월|국 분기별/g, '')
    .replace(/미국/g, '미')
    .replace(/한국/g, '한')
    .replace(/유로존/g, '유로')
    .replace(/영국/g, '영')
    .replace(/중국/g, '중')
    .replace(/일본/g, '일')
    .replace(/독일/g, '독')
    .replace(/프랑스/g, '프')
    .replace(/소비자물가지수/g, '소비자물가')
    .replace(/생산자물가지수/g, '생산자물가')
    .replace(/구매관리자지수/g, 'PMI')
    .trim()

  // 3. 연월 정보(예: (5월), (Q1) 등) 제거
  cleanName = cleanName.replace(/\(\d+월\)/g, '').replace(/\([Qq][1-4]\)/g, '').trim()

  // 4. 최대 6글자로 절삭
  if (cleanName.length > 6) {
    return cleanName.slice(0, 6) + '..'
  }
  return cleanName
}

// 지표 뱃지 스타일 매핑
const getIndicatorBadgeClass = (item: any) => {
  if (!item.actual || item.actual === '발표전') {
    return 'bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20'
  }
  if (item.impact === 'positive') {
    return 'bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20'
  }
  if (item.impact === 'negative') {
    return 'bg-blue-500/10 text-blue-500 border border-blue-500/20 hover:bg-blue-500/20'
  }
  return 'bg-slate-500/10 text-slate-400 border border-slate-500/20 hover:bg-slate-500/20'
}

// 시간 정보 포맷 (HH:MM)
const formatTime = (dateStr: string) => {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date)
}

onMounted(() => {
  loadIndicatorsData()
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
            @change="loadIndicatorsData"
          >
            <option v-for="year in yearOptions" :key="year" :value="year">{{ year }}년</option>
          </select>
          <UIcon name="i-heroicons-chevron-down-20-solid" class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
        </div>

        <div class="relative">
          <select 
            v-model="currentMonth" 
            class="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-2xl pl-4 pr-9 py-2 text-sm font-black text-brand-primary appearance-none focus:outline-none focus:border-brand-primary/50 transition-colors cursor-pointer"
            @change="loadIndicatorsData"
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
      <p class="text-slate-500 font-bold text-sm">경제 지표 데이터를 읽는 중...</p>
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
            'min-h-[110px] p-2 flex flex-col justify-between transition-all duration-300 relative border rounded-2xl overflow-hidden',
            getCellBgClass(cell)
          ]"
        >
          <!-- 날짜 숫자 및 공휴일 표시 -->
          <div class="flex justify-between items-center w-full gap-1 flex-shrink-0">
            <!-- 공휴일 텍스트가 있으면 좌측에 표시 -->
            <span 
              v-if="cell.day && cell.holidayName" 
              class="text-[9px] font-black text-rose-500 bg-rose-500/10 px-1 py-0.5 rounded tracking-tighter truncate max-w-[70%]"
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

          <!-- 경제 지표 뱃지 목록 (스크롤 가능하도록 세부 조정) -->
          <div v-if="cell.items.length > 0" class="mt-2 w-full flex-1 flex flex-col gap-1 overflow-y-auto no-scrollbar max-h-[70px]">
            <UPopover 
              v-for="item in cell.items" 
              :key="item.id" 
              mode="click" 
              :popper="{ placement: 'top', arrow: true }"
              class="w-full"
            >
              <button 
                :class="[
                  'w-full text-[9px] font-extrabold rounded px-1 py-0.5 flex items-center justify-between transition-all leading-tight shadow-sm select-none',
                  getIndicatorBadgeClass(item)
                ]"
              >
                <span class="truncate flex-1 text-left mr-0.5">
                  {{ item.country === 'US' ? '🇺🇸' : item.country === 'KR' ? '🇰🇷' : '🌐' }} 
                  {{ shortenEventName(item.event_name) }}
                </span>
                <!-- 중요도가 높으면 별 기호 추가 -->
                <span v-if="item.importance === 3" class="text-[8px] text-amber-500">★</span>
              </button>

              <template #content="{ close }">
                <div class="p-3 bg-slate-900 border border-slate-800 rounded-2xl max-w-[250px] shadow-2xl text-xs space-y-2.5">
                  <!-- 툴팁 헤더 -->
                  <div class="flex items-start justify-between gap-2 border-b border-white/5 pb-2">
                    <div class="flex flex-col min-w-0">
                      <span class="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-0.5">
                        {{ item.country === 'US' ? '🇺🇸 미국' : item.country === 'KR' ? '🇰🇷 한국' : '🌐 기타' }} · 중요도 {{ item.importance || 1 }}
                      </span>
                      <h5 class="font-black text-slate-100 leading-tight text-xs" :title="item.event_name">
                        {{ item.event_name }}
                      </h5>
                    </div>
                    <button @click="close" class="text-slate-500 hover:text-slate-300 text-base leading-none p-0.5">&times;</button>
                  </div>
                  
                  <!-- 실제, 예측, 이전 수치 정보 -->
                  <div class="grid grid-cols-3 gap-1 text-center bg-slate-950/40 p-2 rounded-xl border border-white/5">
                    <div class="flex flex-col">
                      <span class="text-[8px] text-slate-500 font-bold uppercase tracking-wider">실제</span>
                      <span class="text-[11px] font-black" :class="item.actual && item.actual !== '발표전' ? 'text-slate-100' : 'text-slate-600'">
                        {{ item.actual || '발표전' }}
                      </span>
                    </div>
                    <div class="flex flex-col">
                      <span class="text-[8px] text-slate-500 font-bold uppercase tracking-wider">예측</span>
                      <span class="text-[11px] font-bold text-slate-300">{{ item.forecast || '-' }}</span>
                    </div>
                    <div class="flex flex-col">
                      <span class="text-[8px] text-slate-500 font-bold uppercase tracking-wider">이전</span>
                      <span class="text-[11px] font-bold text-slate-400">{{ item.previous || '-' }}</span>
                    </div>
                  </div>

                  <!-- 툴팁 하단 발표 상태 정보 -->
                  <div class="flex items-center justify-between text-[10px]">
                    <span class="text-slate-500 font-bold">{{ formatTime(item.event_at) }} 발표</span>
                    <span 
                      v-if="item.actual && item.actual !== '발표전'" 
                      class="px-2 py-0.5 rounded font-black tracking-tight"
                      :class="item.impact === 'positive' ? 'bg-rose-500/10 text-rose-500' : item.impact === 'negative' ? 'bg-blue-500/10 text-blue-500' : 'bg-slate-500/10 text-slate-500'"
                    >
                      {{ item.impact === 'positive' ? '시장 호재' : item.impact === 'negative' ? '시장 악재' : '시장 중립' }}
                    </span>
                    <span v-else class="px-2 py-0.5 rounded font-black bg-amber-500/10 text-amber-500">발표 예정</span>
                  </div>
                </div>
              </template>
            </UPopover>
          </div>
          <!-- 지표 데이터가 없는 날짜 빈 공간 유지 -->
          <div v-else class="flex-1"/>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.animate-fade-in {
  animation: fade-in 0.4s ease-out;
}
@keyframes fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
