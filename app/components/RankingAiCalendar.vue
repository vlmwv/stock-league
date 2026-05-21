<script setup lang="ts">
const router = useRouter()
const { fetchAiHistoryMonthly } = useStock()

// 달력 상태 관리
const today = new Date()
const currentYear = ref(today.getFullYear())
const currentMonth = ref(today.getMonth() + 1) // 1-indexed

const loading = ref(true)
const monthlyHistory = ref<any[]>([])

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
  }> = []
  
  // 1일 시작 전 빈 칸 채우기
  for (let i = 0; i < firstDayOfWeek; i++) {
    cells.push({ day: null, dateStr: null, isCurrentMonth: false, items: [], summaryInfo: null })
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
    
    cells.push({
      day: d,
      dateStr,
      isCurrentMonth: true,
      items: dayItems,
      summaryInfo
    })
  }
  
  // 7열 맞추기 위해 뒷부분 빈 칸 채우기
  const totalCells = Math.ceil(cells.length / 7) * 7
  const fillCount = totalCells - cells.length
  for (let i = 0; i < fillCount; i++) {
    cells.push({ day: null, dateStr: null, isCurrentMonth: false, items: [], summaryInfo: null })
  }
  
  return cells
})

// 달력 월 네비게이션
const prevMonth = () => {
  if (currentMonth.value === 1) {
    currentMonth.value = 12
    currentYear.value--
  } else {
    currentMonth.value--
  }
  loadMonthlyData()
}

const nextMonth = () => {
  if (currentMonth.value === 12) {
    currentMonth.value = 1
    currentYear.value++
  } else {
    currentMonth.value++
  }
  loadMonthlyData()
}

const goToday = () => {
  currentYear.value = today.getFullYear()
  currentMonth.value = today.getMonth() + 1
  loadMonthlyData()
}

// 상세 정보 모달 제어
const detailModalOpen = ref(false)
const selectedCell = ref<any>(null)

const openDetailModal = (cell: any) => {
  if (!cell.summaryInfo) return
  selectedCell.value = cell
  detailModalOpen.value = true
}

onMounted(() => {
  loadMonthlyData()
})
</script>

<template>
  <div class="animate-fade-in space-y-6">
    <!-- 달력 헤더부 -->
    <div class="flex items-center justify-between bg-slate-900/40 border border-white/5 rounded-3xl p-5 backdrop-blur-md">
      <h2 class="text-2xl font-black text-slate-100 tracking-tight flex items-baseline gap-2">
        <span>{{ currentYear }}년</span>
        <span class="text-brand-primary">{{ currentMonth }}월</span>
      </h2>
      <div class="flex items-center gap-1.5 bg-slate-950/50 p-1 rounded-2xl border border-white/5">
        <button 
          @click="prevMonth"
          class="w-9 h-9 rounded-xl hover:bg-white/5 text-slate-400 hover:text-slate-200 active:scale-95 transition-all flex items-center justify-center"
        >
          <UIcon name="i-heroicons-chevron-left" class="w-5 h-5" />
        </button>
        <button 
          @click="goToday"
          class="px-4 h-9 rounded-xl hover:bg-white/5 text-xs font-black text-slate-400 hover:text-brand-primary active:scale-95 transition-all flex items-center justify-center uppercase tracking-widest"
        >
          오늘
        </button>
        <button 
          @click="nextMonth"
          class="w-9 h-9 rounded-xl hover:bg-white/5 text-slate-400 hover:text-slate-200 active:scale-95 transition-all flex items-center justify-center"
        >
          <UIcon name="i-heroicons-chevron-right" class="w-5 h-5" />
        </button>
      </div>
    </div>

    <!-- 로딩 인디케이터 -->
    <div v-if="loading" class="text-center py-32 bg-slate-900/20 border border-white/5 rounded-[2.5rem] backdrop-blur-sm">
      <div class="inline-block w-8 h-8 border-4 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin mb-4"></div>
      <p class="text-slate-500 font-bold text-sm">추천 데이터를 분석 중...</p>
    </div>

    <!-- 달력 본문 그리드 -->
    <div v-else class="glass-dark border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
      <!-- 요일 헤더 -->
      <div class="grid grid-cols-7 bg-slate-950/40 border-b border-white/5 text-center py-4">
        <span class="text-xs font-black text-rose-500 tracking-wider">일</span>
        <span class="text-xs font-black text-slate-500 tracking-wider">월</span>
        <span class="text-xs font-black text-slate-500 tracking-wider">화</span>
        <span class="text-xs font-black text-slate-500 tracking-wider">수</span>
        <span class="text-xs font-black text-slate-500 tracking-wider">목</span>
        <span class="text-xs font-black text-slate-500 tracking-wider">금</span>
        <span class="text-xs font-black text-indigo-400 tracking-wider">토</span>
      </div>

      <!-- 날짜 그리드 -->
      <div class="grid grid-cols-7 divide-x divide-y divide-white/5 bg-slate-900/10">
        <div 
          v-for="(cell, index) in calendarCells" 
          :key="index"
          :class="[
            'min-h-[120px] p-3 flex flex-col justify-between transition-all relative group border-t border-l border-white/5 first:border-t-0',
            cell.day ? 'bg-slate-900/10' : 'bg-slate-950/10 pointer-events-none',
            cell.summaryInfo ? 'cursor-pointer hover:bg-white/5' : ''
          ]"
          @click="openDetailModal(cell)"
        >
          <!-- 날짜 숫자 -->
          <div class="flex justify-end w-full">
            <span 
              v-if="cell.day" 
              class="text-xs font-black"
              :class="[
                cell.dateStr && new Date(cell.dateStr).getDay() === 0 ? 'text-rose-500/70' : '',
                cell.dateStr && new Date(cell.dateStr).getDay() === 6 ? 'text-indigo-400/70' : '',
                !(cell.dateStr && (new Date(cell.dateStr).getDay() === 0 || new Date(cell.dateStr).getDay() === 6)) ? 'text-slate-500' : ''
              ]"
            >
              {{ cell.day }}
            </span>
          </div>

          <!-- 추천 요약 카드 (있을 때만 노출) -->
          <div v-if="cell.summaryInfo" class="mt-2 space-y-1.5 w-full relative z-10">
            <!-- 테마 바 -->
            <div class="flex items-center gap-1.5 bg-brand-primary/10 border-l-2 border-brand-primary rounded-r-lg px-2 py-1 overflow-hidden">
              <span class="text-[10px] font-black text-brand-primary tracking-tight truncate leading-tight w-full">
                {{ cell.summaryInfo.theme }}
              </span>
            </div>

            <!-- 대표 종목 및 등락률 -->
            <div class="flex items-center justify-between gap-1 px-1">
              <span class="text-[11px] font-bold text-slate-300 truncate leading-tight">
                {{ cell.summaryInfo.repStockName }}
              </span>
              <span 
                class="text-[10px] font-black tracking-tight shrink-0"
                :class="cell.summaryInfo.repStockRate >= 0 ? 'text-rose-400' : 'text-indigo-400'"
              >
                {{ cell.summaryInfo.repStockRate >= 0 ? '+' : '' }}{{ cell.summaryInfo.repStockRate }}%
              </span>
            </div>

            <!-- 종목수 및 승리 비율 -->
            <div class="px-1 pt-0.5 flex items-center justify-between text-[9px] font-bold text-slate-600">
              <span>S급추적</span>
              <span>{{ cell.summaryInfo.totalCount }}종목 · {{ cell.summaryInfo.winCount }}/{{ cell.summaryInfo.totalCount }}승</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 하단 헬퍼 가이드 -->
    <div class="text-center py-2">
      <p class="text-[10px] font-black text-slate-600 uppercase tracking-widest">
        날짜 클릭 → S급추적 상세
      </p>
    </div>

    <!-- S급추적 상세 모달 팝업 -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="detailModalOpen && selectedCell" class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto">
          <!-- 배경 클릭 시 닫기 -->
          <div class="absolute inset-0" @click="detailModalOpen = false"></div>
          
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
                @click="detailModalOpen = false" 
                class="w-8 h-8 rounded-full bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors flex items-center justify-center border border-white/5"
              >
                <UIcon name="i-heroicons-x-mark-20-solid" class="w-5 h-5" />
              </button>
            </div>

            <!-- 종목 정보 목록 스크롤 -->
            <div class="flex-1 overflow-y-auto px-6 py-4 space-y-4 no-scrollbar">
              <div 
                v-for="item in selectedCell.items" 
                :key="item.daily_id"
                @click="router.push('/stocks/' + item.code); detailModalOpen = false"
                class="glass-dark rounded-3xl p-5 border border-white/5 hover:bg-white/5 transition-all cursor-pointer group relative overflow-hidden flex flex-col gap-4"
              >
                <!-- 카드 배경 글로우 데코 -->
                <div 
                  class="absolute -top-12 -right-12 w-28 h-28 blur-3xl rounded-full opacity-10 group-hover:opacity-20 transition-all duration-500"
                  :class="item.cumulative_change_rate >= 0 ? 'bg-rose-500' : 'bg-indigo-500'"
                ></div>

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
                @click="detailModalOpen = false"
                class="w-full h-13 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold active:scale-95 transition-all text-xs uppercase tracking-widest border border-white/5"
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
