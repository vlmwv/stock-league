<script setup lang="ts">
const router = useRouter()

// 달력 상태·그리드 계산은 useAiCalendar가 담당
const {
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
} = useAiCalendar()

// 상세 정보 모달 제어 (뷰/인터랙션 관심사)
const detailModalOpen = ref(false)
const selectedCell = ref<any>(null)

const openDetailModal = (cell: any) => {
  if (!cell.summaryInfo) return
  selectedCell.value = cell
  detailModalOpen.value = true
}

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
                        :class="changeTextClass(item.cumulative_change_rate >= 0)"
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
