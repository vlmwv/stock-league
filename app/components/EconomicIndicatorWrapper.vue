<script setup lang="ts">
const { fetchEconomicIndicators } = useStock()

const indicators = ref<any[]>([])
const isLoadingIndicators = ref(false)
const indicatorTab = ref<'upcoming' | 'announced'>('announced')
const indicatorView = ref<'calendar' | 'list'>('calendar')

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

// 뷰 모드 감시 및 지표 목록 로드 (Lazy Loading)
watch(indicatorView, (newView) => {
  if (newView === 'list' && indicators.value.length === 0) {
    loadIndicators()
  }
}, { immediate: true })
</script>

<template>
  <div class="space-y-6">
    <!-- 경제지표 뷰 모드 토글 및 서브 탭 -->
    <div class="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
      <!-- 리스트 뷰일 때만 서브 탭을 노출 -->
      <div v-if="indicatorView === 'list'" class="flex items-center gap-4">
        <button 
          class="relative pb-1 text-[11px] font-black tracking-widest transition-all duration-300"
          :class="indicatorTab === 'announced' ? 'text-brand-primary' : 'text-slate-500'"
          @click="indicatorTab = 'announced'"
        >
          발표 완료
          <div v-if="indicatorTab === 'announced'" class="absolute bottom-0 left-0 w-full h-0.5 bg-brand-primary rounded-full animate-scale-x"/>
        </button>
        <button 
          class="relative pb-1 text-[11px] font-black tracking-widest transition-all duration-300"
          :class="indicatorTab === 'upcoming' ? 'text-brand-primary' : 'text-slate-500'"
          @click="indicatorTab = 'upcoming'"
        >
          발표 예정
          <div v-if="indicatorTab === 'upcoming'" class="absolute bottom-0 left-0 w-full h-0.5 bg-brand-primary rounded-full animate-scale-x"/>
        </button>
      </div>
      <div v-else class="flex items-center gap-1.5 py-0.5">
        <UIcon name="i-heroicons-calendar-days" class="w-4 h-4 text-brand-primary" />
        <span class="text-[11px] font-black text-slate-200 tracking-wider">경제 지표 캘린더</span>
      </div>

      <!-- 캘린더 / 리스트 전환 버튼 -->
      <div class="flex p-0.5 bg-slate-950/60 rounded-xl border border-white/5 shadow-inner">
        <button 
          class="px-2.5 py-1 rounded-lg text-[10px] font-black transition-all flex items-center gap-1"
          :class="indicatorView === 'calendar' ? 'bg-slate-800 text-brand-primary shadow' : 'text-slate-500 hover:text-slate-300'"
          @click="indicatorView = 'calendar'"
        >
          <UIcon name="i-heroicons-calendar" class="w-3.5 h-3.5" />
          캘린더
        </button>
        <button 
          class="px-2.5 py-1 rounded-lg text-[10px] font-black transition-all flex items-center gap-1"
          :class="indicatorView === 'list' ? 'bg-slate-800 text-slate-100 shadow' : 'text-slate-500 hover:text-slate-300'"
          @click="indicatorView = 'list'"
        >
          <UIcon name="i-heroicons-list-bullet" class="w-3.5 h-3.5" />
          리스트
        </button>
      </div>
    </div>

    <!-- 캘린더 뷰 -->
    <template v-if="indicatorView === 'calendar'">
      <EconomicIndicatorCalendar />
    </template>

    <!-- 리스트 뷰 -->
    <template v-else>
      <div v-if="isLoadingIndicators" class="flex flex-col items-center justify-center py-20 gap-4">
        <div class="w-10 h-10 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"/>
        <p class="text-xs text-slate-500 font-bold uppercase tracking-widest animate-pulse">지표 로드 중...</p>
      </div>
      <div v-else-if="indicatorTab === 'upcoming' && upcomingIndicators.length === 0" class="flex flex-col items-center justify-center py-20 text-center">
        <UIcon name="i-heroicons-calendar-days" class="w-12 h-12 text-slate-700 mb-4" />
        <p class="text-sm text-slate-500 font-medium">발표 예정인 지표가 없습니다.</p>
      </div>

      <div v-else-if="indicatorTab === 'announced' && announcedIndicators.length === 0" class="flex flex-col items-center justify-center py-20 text-center">
        <UIcon name="i-heroicons-check-circle" class="w-12 h-12 text-slate-700 mb-4" />
        <p class="text-sm text-slate-500 font-medium">최근 발표된 지표가 없습니다.</p>
      </div>

      <template v-else>
        <!-- 1. 발표 예정 일정 (Upcoming) -->
        <div v-if="indicatorTab === 'upcoming'" class="space-y-4">
           <EconomicIndicatorCard 
              v-for="indicator in upcomingIndicators" 
              :key="indicator.id" 
              :item="indicator" 
              class="opacity-70 hover:opacity-100 transition-opacity duration-300" 
           />
        </div>

        <!-- 2. 발표 완료 지표 (Announced) -->
        <div v-if="indicatorTab === 'announced'" class="space-y-4">
           <EconomicIndicatorCard 
              v-for="indicator in announcedIndicators" 
              :key="indicator.id" 
              :item="indicator" 
           />
        </div>
      </template>
    </template>
  </div>
</template>
