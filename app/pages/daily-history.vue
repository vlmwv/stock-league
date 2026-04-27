<template>
  <div class="min-h-screen bg-bg-deep pb-32 overflow-x-hidden">
    <TopHeader />

    <main class="max-w-md mx-auto px-6 py-8">
      <div class="mb-8 flex items-center gap-4">
        <button 
          @click="router.back()" 
          class="w-10 h-10 rounded-2xl bg-slate-800/50 border border-white/5 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all active:scale-95"
        >
          <UIcon name="i-heroicons-arrow-left-20-solid" class="w-5 h-5" />
        </button>
        <div>
          <h2 class="text-3xl font-black text-slate-100 tracking-tight">AI 추천 이력</h2>
          <p class="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Past AI Recommendations</p>
        </div>
      </div>

      <!-- History List Grouped by Date -->
      <div class="space-y-10">
        <div v-if="loading" class="text-center py-20">
          <div class="inline-block w-8 h-8 border-4 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin mb-4"></div>
          <p class="text-slate-500 font-bold">이력을 불러오는 중...</p>
        </div>
        
        <div v-else-if="groupedHistory.length === 0" class="text-center py-20 px-10">
          <div class="w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center mx-auto mb-6">
            <UIcon name="i-heroicons-sparkles" class="w-10 h-10 text-slate-700" />
          </div>
          <h3 class="text-lg font-black text-slate-300 mb-2 tracking-tight">기록이 없습니다.</h3>
          <p class="text-xs text-slate-500 font-medium leading-relaxed">
            {{ emptyMessage }}
          </p>
        </div>

        <div v-else v-for="group in groupedHistory" :key="group.date" class="space-y-4">
          <div class="flex items-center gap-4 px-2">
            <h3 class="text-sm font-black text-slate-400 uppercase tracking-widest">{{ group.date }}</h3>
            <div class="h-px bg-white/5 flex-1"></div>
            <span class="text-[10px] font-bold text-slate-600">{{ group.items.length }} 종목</span>
          </div>

          <div 
            v-for="item in group.items" 
            :key="item.daily_id" 
            @click="navigateTo('/stocks/' + item.code)"
            class="glass-dark rounded-[2rem] p-6 border border-white/5 relative overflow-hidden group hover:bg-white/5 transition-all cursor-pointer"
          >
            <!-- 카드 배경 글로우 -->
            <div 
              class="absolute -top-12 -right-12 w-32 h-32 blur-3xl rounded-full transition-all duration-700 opacity-20 group-hover:opacity-40"
              :class="item.cumulative_change_rate >= 0 ? 'bg-emerald-500' : 'bg-indigo-500'"
            ></div>

            <div class="relative z-10">
              <!-- 종목 정보 및 상단 정보 -->
              <div class="flex items-center justify-between mb-6">
                <div class="flex flex-col gap-1">
                  <div class="flex items-center gap-2">
                    <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest">{{ formatDateTime(item.created_at) }} 추천</span>
                    <UBadge v-if="item.status === 'withdrawn'" color="error" variant="subtle" class="rounded-lg font-bold text-[8px] uppercase">추천 해제됨</UBadge>
                  </div>
                  <div class="flex items-baseline gap-1.5 mt-0.5">
                    <h4 class="text-lg font-black text-slate-200">{{ item.name }}</h4>
                    <span class="text-xs font-bold text-slate-500 uppercase tracking-widest">{{ item.code }}</span>
                  </div>
                </div>
                <div class="flex flex-col items-end gap-2">
                  <div class="px-3 py-1 bg-white/5 rounded-full border border-white/10">
                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">AI 점수: {{ item.ai_score }}P</span>
                  </div>
                  <span class="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                    {{ item.days_passed === 0 ? '오늘 추천' : `${item.days_passed}일 경과` }}
                  </span>
                </div>
              </div>

              <!-- 가격 정보 비교 -->
              <div class="grid grid-cols-2 gap-4 mb-6">
                <div class="space-y-1">
                  <p class="text-[9px] font-black text-slate-500 uppercase tracking-widest">추천 시점 가격</p>
                  <p class="text-lg font-black text-slate-300 tracking-tight">{{ item.rec_price?.toLocaleString() }}원</p>
                </div>
                <div class="space-y-1 text-right">
                  <p class="text-[9px] font-black text-slate-500 uppercase tracking-widest">현재 가격</p>
                  <p class="text-lg font-black text-slate-100 tracking-tight">{{ item.last_price?.toLocaleString() }}원</p>
                </div>
              </div>

              <!-- 수익률 하이라이트 -->
              <div 
                class="rounded-2xl p-5 border transition-all duration-500 flex flex-col items-center justify-center gap-1 shadow-2xl"
                :class="item.days_passed <= 0 
                  ? 'bg-slate-500/10 border-slate-500/20 text-slate-400 shadow-slate-500/5'
                  : (item.cumulative_change_rate >= 0 
                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-400 shadow-rose-500/5' 
                    : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 shadow-indigo-500/5')"
              >
                <div class="flex items-center gap-2">
                  <UIcon 
                    v-if="item.days_passed > 0"
                    :name="item.cumulative_change_rate >= 0 ? 'i-heroicons-arrow-trending-up-20-solid' : 'i-heroicons-arrow-trending-down-20-solid'" 
                    class="w-6 h-6" 
                  />
                  <UIcon 
                    v-else
                    name="i-heroicons-clock" 
                    class="w-5 h-5 opacity-50" 
                  />
                  <span class="text-3xl font-black tracking-tighter">
                    {{ item.days_passed <= 0 ? '-' : (item.cumulative_change_rate > 0 ? '+' : '') + item.cumulative_change_rate + '%' }}
                  </span>
                </div>

                <p class="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">
                  {{ item.days_passed <= 0 ? '결과 대기 중' : '예상 수익률' }}
                </p>
              </div>

              <!-- 목표가 정보 추가 -->
              <div v-if="item.target_price" class="mt-6 grid grid-cols-2 gap-4 py-4 px-5 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                <div class="space-y-0.5">
                  <p class="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest">목표가</p>
                  <p class="text-sm font-black text-emerald-400 font-mono">{{ item.target_price.toLocaleString() }}원</p>
                </div>
                <div class="space-y-0.5 text-right">
                  <p class="text-[9px] font-black text-slate-500 uppercase tracking-widest">목표기한</p>
                  <p class="text-sm font-black text-slate-300">{{ item.target_date }}</p>
                </div>
              </div>



              <!-- AI 요약 -->
              <div class="mt-6 pt-6 border-t border-white/5 relative">
                <p v-if="item.summary" class="text-xs text-slate-400 leading-relaxed font-medium italic opacity-70 line-clamp-2 pr-6">
                   "{{ item.summary }}"
                </p>
                <p v-else class="text-xs text-slate-500 font-medium italic pr-6">요약 정보가 없습니다.</p>
                <UIcon name="i-heroicons-arrow-right-20-solid" class="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-hover:text-brand-primary transition-all" />
              </div>
            </div>
          </div>
        </div>

        <!-- Infinite Scroll Trigger -->
        <div ref="loadMoreTrigger" class="h-20 flex items-center justify-center">
          <div v-if="moreLoading" class="w-6 h-6 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin"></div>
        </div>
      </div>
    </main>

    <BottomNav />
  </div>
</template>

<script setup lang="ts">
const router = useRouter()
const { fetchAiHistory } = useStock()

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  
  // KST 형식으로 포맷팅 (MM.DD HH:mm)
  const options = { 
    timeZone: 'Asia/Seoul', 
    month: '2-digit', 
    day: '2-digit', 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false
  } as const
  
  const formatter = new Intl.DateTimeFormat('ko-KR', options)
  const parts = formatter.formatToParts(date)
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || ''
  
  return `${getPart('month')}.${getPart('day')} ${getPart('hour')}:${getPart('minute')}`
}

const history = ref<any[]>([])
const loading = ref(true)
const moreLoading = ref(false)
const page = ref(1)
const hasMore = ref(true)
const loadMoreTrigger = ref<HTMLElement | null>(null)
const emptyReason = ref<'no_data' | 'join_missing' | 'error' | null>(null)

const emptyMessage = computed(() => {
  if (emptyReason.value === 'error') return '이력을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
  if (emptyReason.value === 'join_missing') return '추천 데이터는 있으나 종목 연결 정보가 없어 표시할 수 없습니다.'
  return '아직 추천된 종목 이력이 없습니다.'
})

const groupedHistory = computed(() => {
  const groups: { date: string, items: any[] }[] = []
  history.value.forEach(item => {
    const existingGroup = groups.find(g => g.date === item.game_date)
    if (existingGroup) {
      existingGroup.items.push(item)
    } else {
      groups.push({ date: item.game_date, items: [item] })
    }
  })
  return groups
})

const loadHistory = async (isInitial = false) => {
  if (isInitial) {
    loading.value = true
  } else {
    moreLoading.value = true
  }

  const result = await fetchAiHistory(page.value, 20)
  const newData = result.items
  
  if (newData.length < 20) {
    hasMore.value = false
  }

  if (isInitial) {
    history.value = newData
    emptyReason.value = result.emptyReason
    loading.value = false
  } else {
    history.value = [...history.value, ...newData]
    moreLoading.value = false
  }
}

onMounted(async () => {
  await loadHistory(true)

  if (process.client) {
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0]
      if (entry && entry.isIntersecting && !moreLoading.value && hasMore.value) {
        page.value++
        loadHistory()
      }
    }, { threshold: 0.1 })

    if (loadMoreTrigger.value) {
      observer.observe(loadMoreTrigger.value)
    }
  }
})
</script>
