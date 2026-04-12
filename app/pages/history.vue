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
          <h2 class="text-3xl font-black text-slate-100 tracking-tight">전체 예측 기록</h2>
          <p class="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Your Complete Prediction Log</p>
        </div>
      </div>

      <!-- History List -->
      <div class="space-y-4">
        <div v-if="loading" class="text-center py-20">
          <div class="inline-block w-8 h-8 border-4 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin mb-4"></div>
          <p class="text-slate-500 font-bold">기록을 불러오는 중...</p>
        </div>
        
        <div v-else-if="history.length === 0" class="text-center py-20 px-10 text-center">
          <div class="w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center mx-auto mb-6">
            <UIcon name="i-heroicons-document-magnifying-glass" class="w-10 h-10 text-slate-700" />
          </div>
          <h3 class="text-lg font-black text-slate-300 mb-2 tracking-tight">예측 기록이 없습니다.</h3>
          <p class="text-xs text-slate-500 font-medium leading-relaxed">
            아직 예측에 참여하지 않았습니다. 오늘의 리그에 참여해 보세요!
          </p>
          <NuxtLink to="/daily" class="mt-8 px-8 py-4 rounded-2xl bg-brand-primary text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-brand-primary/20 hover:scale-105 transition-transform">
            첫 예측 시작하기
          </NuxtLink>
        </div>

        <div v-else class="space-y-4">
          <NuxtLink 
            v-for="item in history" 
            :key="item.id" 
            :to="item.stockCode ? '/stocks/' + item.stockCode : undefined"
            class="glass-dark rounded-3xl p-5 border border-white/5 flex items-center gap-4 group hover:bg-white/5 transition-colors block cursor-pointer"
          >
            <!-- Icon/Initial -->
            <div class="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-sm font-black border border-white/5 shrink-0 text-slate-400">
               {{ item.stockName.substring(0, 1) }}
            </div>

            <!-- Stock Info -->
            <div class="flex-1 min-w-0">
               <div class="flex items-center gap-2">
                 <h4 class="font-bold text-slate-200 truncate">{{ item.stockName }}</h4>
                 <span v-if="item.stockCode" class="text-[10px] font-bold text-slate-600 uppercase shrink-0">{{ item.stockCode }}</span>
               </div>
               <div class="flex items-center gap-2 mt-1">
                 <span class="text-[10px] font-bold text-slate-500 whitespace-nowrap">{{ item.game_date }}</span>
                 <span class="w-1 h-1 rounded-full bg-slate-800"></span>
                 <span 
                   class="text-[10px] font-black"
                   :class="item.prediction_type === 'up' ? 'text-rose-400' : 'text-indigo-400'"
                 >
                   {{ item.prediction_type === 'up' ? '상승' : '하락' }} 예측
                 </span>
               </div>
            </div>

            <!-- Status & Points -->
            <div class="flex flex-col items-end gap-2 shrink-0">
               <span 
                 class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border"
                 :class="{
                   'bg-emerald-500/10 text-emerald-500 border-emerald-500/20': item.result === 'win',
                   'bg-rose-500/10 text-rose-500 border-rose-500/20': item.result === 'lose',
                   'bg-slate-500/10 text-slate-500 border-slate-500/20': item.result === 'pending' || item.result === 'draw'
                 }"
               >
                 {{ 
                   item.result === 'win' ? '성공' : 
                   item.result === 'lose' ? '실패' : 
                   item.result === 'draw' ? '무승부' : '대기중'
                 }}
               </span>
               <p v-if="item.result !== 'pending' && item.points_awarded !== 0" class="text-xs font-black text-brand-primary tracking-tighter">
                 {{ item.points_awarded > 0 ? '+' : '' }}{{ item.points_awarded }}p
               </p>
            </div>
          </NuxtLink>

          <!-- Infinite Scroll Trigger -->
          <div ref="loadMoreTrigger" class="h-10 flex items-center justify-center mt-4">
            <div v-if="moreLoading" class="w-6 h-6 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    </main>

    <BottomNav />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

const router = useRouter()
const { fetchUserHistory } = useStock()
const history = ref<any[]>([])
const loading = ref(true)
const moreLoading = ref(false)
const page = ref(1)
const hasMore = ref(true)
const loadMoreTrigger = ref<HTMLElement | null>(null)

const loadHistory = async (isInitial = false) => {
  if (isInitial) {
    loading.value = true
  } else {
    moreLoading.value = true
  }

  const newData = await fetchUserHistory(page.value, 20)
  
  if (newData.length < 20) {
    hasMore.value = false
  }

  if (isInitial) {
    history.value = newData
    loading.value = false
  } else {
    history.value = [...history.value, ...newData]
    moreLoading.value = false
  }
}

onMounted(async () => {
  await loadHistory(true)

  // Infinite Scroll with Intersection Observer
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
