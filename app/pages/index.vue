<template>
  <div class="min-h-screen bg-bg-deep pb-32 overflow-x-hidden selection:bg-brand-primary/30">
    <TopHeader />

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

      <!-- Stock List Section -->
      <section class="px-6 space-y-6">
        <div class="flex justify-between items-end mb-2 px-2">
          <div>
            <h3 class="text-xl font-black text-slate-200 tracking-tight">오늘의 종목</h3>
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
const { dailyStocks, myPredictions, refresh, predict } = useStock()
const hearts = ref<number[]>([])
const isResultOpen = ref(false)
const selectedStockName = ref('')
const selectedPrediction = ref<'up' | 'down' | null>(null)
const showHint = ref(true)

const toggleHeart = (id: number) => {
  const index = hearts.value.indexOf(id)
  if (index > -1) {
    hearts.value.splice(index, 1)
  } else {
    hearts.value.push(id)
  }
}

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
  }
}

const cancelPrediction = (id: number) => {
  const index = myPredictions.value.findIndex(p => p.stockId === id)
  if (index > -1) {
    myPredictions.value.splice(index, 1)
  }
}

onMounted(async () => {
  await refresh()
  // Hide hint after 5 seconds
  setTimeout(() => { showHint.value = false }, 5000)
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
</style>
