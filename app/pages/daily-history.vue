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
            class="glass-dark rounded-3xl p-5 border border-white/5 relative group hover:bg-white/5 transition-all cursor-pointer"
          >
            <div class="flex justify-between items-start mb-3">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-[10px] font-mono text-slate-500 uppercase tracking-tighter">{{ item.code }}</span>
                  <div 
                    v-if="item.ai_score" 
                    class="flex items-center gap-1 px-1.5 py-0.5 rounded-lg border border-emerald-400/20 bg-emerald-400/5 text-emerald-400"
                  >
                    <span class="text-[10px] font-black leading-none">{{ item.ai_score }}P</span>
                  </div>
                </div>
                <h4 class="text-xl font-black text-slate-100 group-hover:text-brand-primary transition-colors">{{ item.name }}</h4>
              </div>

              <!-- 결과 배지 -->
              <div 
                v-if="item.ai_result !== 'pending'"
                class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border"
                :class="{
                  'bg-emerald-500/10 text-emerald-500 border-emerald-500/20': item.ai_result === 'win',
                  'bg-rose-500/10 text-rose-500 border-rose-500/20': item.ai_result === 'lose',
                  'bg-slate-500/10 text-slate-500 border-slate-500/20': item.ai_result === 'draw'
                }"
              >
                {{ 
                  item.ai_result === 'win' ? '예측 성공' : 
                  item.ai_result === 'lose' ? '예측 실패' : '무승부'
                }}
              </div>
            </div>

            <p class="text-xs text-slate-400 leading-relaxed italic mb-4 line-clamp-2">
              "{{ item.summary }}"
            </p>

            <div class="flex items-center justify-between pt-4 border-t border-white/5">
              <div class="flex items-center gap-4">
                <div class="flex flex-col">
                  <span class="text-[9px] font-bold text-slate-600 uppercase tracking-widest">당일 종가</span>
                  <span class="text-sm font-black text-slate-300">{{ item.last_price.toLocaleString() }}원</span>
                </div>
                <div class="flex flex-col">
                  <span class="text-[9px] font-bold text-slate-600 uppercase tracking-widest">변동</span>
                  <span 
                    class="text-sm font-black"
                    :class="item.change_amount >= 0 ? 'text-rose-400' : 'text-indigo-400'"
                  >
                    {{ item.change_amount > 0 ? '+' : '' }}{{ item.change_amount.toLocaleString() }} ({{ item.change_rate }}%)
                  </span>
                </div>
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
