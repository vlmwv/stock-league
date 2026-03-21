<template>
  <div class="min-h-screen bg-bg-deep pb-32 overflow-x-hidden selection:bg-brand-primary/30">
    <TopHeader @open-guide="isGuideOpen = true" />
    <LeagueGuide :is-open="isGuideOpen" @close="isGuideOpen = false" />

    <main class="max-w-md mx-auto">
      <!-- Hero Section (Premium Gradient) -->
      <section class="px-6 py-8">
        <div class="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-brand-primary/20 via-brand-secondary/10 to-transparent border border-white/10 p-10 shadow-3xl">
          <div class="relative z-10">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 mb-4 animate-pulse-soft">
              <span class="w-1.5 h-1.5 rounded-full bg-brand-primary"></span>
              <span class="text-[10px] font-black text-brand-primary uppercase tracking-widest">Today's League</span>
            </div>
            <h2 class="text-4xl font-black mb-6 leading-[1.1] tracking-tighter text-slate-100">
              오늘의 차트를 <br/>
              <span class="bg-gradient-to-r from-brand-primary to-brand-secondary bg-clip-text text-transparent">예측해 보세요!</span>
            </h2>
            <div class="flex gap-3">
              <div class="flex -space-x-2">
                <div v-for="i in 3" :key="i" class="w-7 h-7 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-[10px] font-bold">
                   {{ i }}
                </div>
              </div>
              <p class="text-xs text-slate-400 font-medium flex items-center">
                <span class="text-brand-primary font-bold mr-1">1,240명</span> 참여 중
              </p>
            </div>
          </div>
          <!-- Decorative UI elements -->
          <div class="absolute -top-10 -right-10 w-48 h-48 bg-brand-primary/20 blur-[60px] rounded-full"></div>
          <div class="absolute top-1/2 -left-10 w-32 h-32 bg-brand-secondary/20 blur-[60px] rounded-full"></div>
        </div>
      </section>

      <!-- Recommended Stocks (Horizontal Scroll) -->
      <section v-if="recommendedStocks && recommendedStocks.length > 0" class="px-6 mb-10">
        <div class="flex justify-between items-end mb-4 px-2">
          <div>
            <h3 class="text-xl font-black text-slate-200 tracking-tight">AI 추천 종목</h3>
            <p class="text-[10px] text-brand-primary font-bold uppercase tracking-widest mt-0.5">Real-time AI Insights</p>
          </div>
        </div>
        
        <div class="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-6 px-6">
          <div 
            v-for="stock in recommendedStocks" 
            :key="stock.id"
            class="min-w-[280px] glass-dark rounded-3xl p-5 border border-white/5 relative overflow-hidden group"
          >
            <div class="flex justify-between items-start mb-3">
              <h4 class="font-bold text-slate-200">{{ stock.name }}</h4>
              <button 
                @click.stop="toggleHeart(stock.id)"
                class="transition-colors"
                :class="isHearted(stock.id) ? 'text-rose-500' : 'text-slate-600'"
              >
                <UIcon :name="isHearted(stock.id) ? 'i-heroicons-heart-20-solid' : 'i-heroicons-heart'" class="w-4 h-4" />
              </button>
            </div>
            <p class="text-xs text-slate-400 line-clamp-2 italic mb-3">"{{ stock.summary }}"</p>
            <div class="flex justify-between items-center text-[10px] font-bold">
              <span class="text-slate-500 uppercase">{{ stock.code }}</span>
              <span :class="stock.change_amount >= 0 ? 'text-rose-400' : 'text-indigo-400'">
                {{ stock.last_price.toLocaleString() }}
              </span>
            </div>
            <!-- Decorative gradient -->
            <div class="absolute -bottom-4 -right-4 w-16 h-16 bg-brand-primary/5 blur-2xl rounded-full group-hover:bg-brand-primary/10 transition-colors"></div>
          </div>
        </div>
      </section>

      <!-- Stock List Section -->
      <section class="px-6 space-y-6">
        <div class="flex justify-between items-end mb-2 px-2">
          <div>
            <h3 class="text-xl font-black text-slate-200 tracking-tight">오늘의 도전 종목</h3>
            <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Selection of 5 Stocks</p>
          </div>
          <div class="text-right">
            <p class="text-xs font-bold text-slate-400">20:20</p>
            <p class="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Result Reveal</p>
          </div>
        </div>

        <div class="space-y-6">
          <StockCard 
            v-for="stock in dailyStocks" 
            :key="stock.id"
            :stock="stock"
            :is-hearted="isHearted(stock.id)"
            :prediction="getPrediction(stock.id)"
            @predict="onPredict"
            @toggle-heart="toggleHeart"
            @cancel-prediction="cancelPrediction"
          />
        </div>
      </section>

      <!-- Stock List Section (Card Stack) -->
      <section class="px-6 relative h-[500px]">
        <div v-if="currentIndex < dailyStocks.length" class="relative w-full h-full">
          <StockCard 
            v-for="(stock, index) in dailyStocks.slice(currentIndex, currentIndex + 3)" 
            :key="stock.id"
            :stock="stock"
            :is-hearted="isHearted(stock.id)"
            :prediction="getPrediction(stock.id)"
            :is-top="index === 0"
            :index="index"
            class="absolute inset-0 transition-all duration-500"
            :style="{
              transform: `translateY(${index * 20}px) scale(${1 - index * 0.05})`,
              opacity: 1 - index * 0.2,
              filter: `blur(${index * 2}px)`
            }"
            @predict="onPredict"
            @toggle-heart="toggleHeart"
            @cancel-prediction="cancelPrediction"
          />
        </div>

        <!-- All Completed State -->
        <div v-else class="flex flex-col items-center justify-center h-full text-center space-y-6 animate-scale-in">
          <div class="w-20 h-20 rounded-full bg-brand-primary/20 flex items-center justify-center border border-brand-primary/30 shadow-2xl">
            <UIcon name="i-heroicons-check-circle-20-solid" class="w-10 h-10 text-brand-primary" />
          </div>
          <div class="space-y-2">
            <h3 class="text-2xl font-black text-slate-100 italic">오늘의 예측 완료!</h3>
            <p class="text-sm text-slate-400 font-medium">내일 20:20에 결과를 확인하세요.</p>
          </div>
          <NuxtLink 
            to="/ranking"
            class="px-8 py-3 rounded-2xl bg-slate-800 text-slate-200 font-black text-xs uppercase tracking-widest border border-white/5 hover:bg-slate-700 transition-all"
          >
            랭킹 확인하기
          </NuxtLink>
        </div>
      </section>
    </main>

    <!-- Dialogs & Nav -->
    <PredictionResultDialog 
      :is-open="isResultOpen"
      :stock-name="selectedStockName"
      :prediction="selectedPrediction"
      @close="isResultOpen = false"
    />
    
    <BottomNav />

    <!-- Hint Toast (Optional but good for UX) -->
    <div v-if="showHint" class="fixed bottom-24 inset-x-0 flex justify-center z-40 animate-fade-in-up">
       <div class="glass flex items-center gap-2 px-4 py-2 rounded-2xl shadow-2xl">
          <UIcon name="i-heroicons-hand-raised-20-solid" class="w-4 h-4 text-brand-primary" />
          <p class="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Swipe Up for UP, Down for DOWN</p>
       </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { dailyStocks, hearts, myPredictions, refresh, fetchWishlist, toggleHeart, predict } = useStock()
const isResultOpen = ref(false)
const selectedStockName = ref('')
const selectedPrediction = ref<'up' | 'down' | null>(null)
const showHint = ref(false)
const isGuideOpen = ref(false)
const currentIndex = ref(0)

const isHearted = (id: number) => hearts.value.includes(id)
const getPrediction = (id: number) => myPredictions.value.find(p => p.stockId === id)?.prediction || null

const onPredict = (id: number, prediction: 'up' | 'down') => {
  const stock = dailyStocks.value.find(s => s.id === id)
  if (stock) {
    predict(id, prediction)
    selectedStockName.value = stock.name
    selectedPrediction.value = prediction
    isResultOpen.value = true
    showHint.value = false
    
    // Move to next card after animation
    setTimeout(() => {
      currentIndex.value++
    }, 600)
  }
}

const cancelPrediction = (id: number) => {
  const index = myPredictions.value.findIndex(p => p.stockId === id)
  if (index > -1) {
    myPredictions.value.splice(index, 1)
    if (currentIndex.value > 0) {
      currentIndex.value--
    }
  }
}

onMounted(async () => {
  await Promise.all([
    refresh(),
    fetchWishlist()
  ])
  
  // Show guide on first visit
  const hasSeenGuide = localStorage.getItem('hasSeenLeagueGuide')
  if (!hasSeenGuide) {
    isGuideOpen.value = true
    localStorage.setItem('hasSeenLeagueGuide', 'true')
  }

  // Show hint after 2 seconds
  setTimeout(() => { showHint.value = true }, 2000)
  // Hide hint after 7 seconds
  setTimeout(() => { showHint.value = false }, 7000)
})
</script>

<style scoped>
.animate-fade-in-up {
  animation: fade-in-up 0.5s ease-out;
}
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
