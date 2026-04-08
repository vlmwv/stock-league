<template>
  <div class="min-h-screen bg-bg-deep pb-32 overflow-x-hidden">
    <TopHeader />

    <main class="max-w-md mx-auto px-6 py-8">
      <div class="mb-8 flex justify-between items-center sm:items-end gap-4">
        <div>
          <div class="flex items-center gap-3 mb-2">
            <button 
              @click="router.back()" 
              class="w-10 h-10 rounded-2xl bg-slate-800/50 border border-white/5 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all active:scale-95"
            >
              <UIcon name="i-heroicons-arrow-left-20-solid" class="w-5 h-5" />
            </button>
            <h2 class="text-3xl font-black text-slate-100 tracking-tight">관심 종목</h2>
          </div>
          <p class="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] pl-13">Your Private Watchlist</p>
        </div>
        
        <div class="bg-rose-500/10 border border-rose-500/20 px-4 py-2 rounded-2xl flex items-center gap-2 shrink-0">
           <UIcon name="i-heroicons-heart-20-solid" class="w-4 h-4 text-rose-500" />
           <span class="text-[11px] font-black text-rose-500 uppercase tracking-widest">{{ heartedStocks.length }}</span>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="heartedStocks.length === 0" class="flex flex-col items-center justify-center py-20 px-10 text-center">
         <div class="w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center mb-6">
            <UIcon name="i-heroicons-heart" class="w-10 h-10 text-slate-700" />
         </div>
         <h3 class="text-lg font-black text-slate-300 mb-2 tracking-tight">찜한 종목이 없습니다.</h3>
         <p class="text-xs text-slate-500 font-medium leading-relaxed">
           메인 화면에서 종목 카드를 길게 누르거나 하트 아이콘을 클릭하여 관심 종목에 추가해 보세요!
         </p>
         <NuxtLink 
           to="/"
           class="mt-8 px-8 py-4 rounded-2xl bg-brand-primary text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-brand-primary/20 hover:scale-105 transition-transform"
         >
           게임하러 가기
         </NuxtLink>
      </div>

      <!-- Wishlist Stack -->
      <div v-else class="space-y-6 mt-8">
        <StockCard 
          v-for="(stock, idx) in heartedStocks" 
          :key="stock.id"
          :stock="stock"
          :is-hearted="hearts.includes(Number(stock.id))"
          :is-league-open="isLeagueOpen"
          :is-predictable="isLeagueStock(stock.id)"
          :prediction="getPrediction(stock.id)"
          :is-top="idx === 0"
          :index="idx"
          @predict="onPredict"
          @toggle-heart="toggleHeart"
          @cancel-prediction="cancelPrediction"
        />
      </div>
    </main>

    <PredictionResultDialog 
      :is-open="isResultOpen"
      :stock-name="selectedStockName"
      :prediction="selectedPrediction"
      @close="isResultOpen = false"
    />

    <BottomNav />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})
const router = useRouter()
const { dailyStocks, wishlistStocks, hearts, myPredictions, predict, toggleHeart, fetchWishlist, fetchPredictions, isLeagueOpen, refresh } = useStock()

const heartedStocks = computed(() => wishlistStocks.value || [])

const isResultOpen = ref(false)
const selectedStockName = ref('')
const selectedPrediction = ref<'up' | 'down' | null>(null)

const getPrediction = (id: number) => myPredictions.value.find(p => p.stockId === id)?.prediction || null
const isLeagueStock = (id: number) => dailyStocks.value?.some((s: any) => s.id === id) || false

const onPredict = (id: number, prediction: 'up' | 'down') => {
  const stock = (wishlistStocks.value || []).find((s: any) => s.id === id)
  if (stock) {
    // Only allow prediction if it's a league stock
    if (!isLeagueStock(id)) return
    
    predict(id, prediction, (stock as any).game_date)
    selectedStockName.value = stock.name
    selectedPrediction.value = prediction
    isResultOpen.value = true
  }
}

const cancelPrediction = (id: number) => {
  const index = myPredictions.value.findIndex(p => p.stockId === id)
  if (index > -1) {
    myPredictions.value.splice(index, 1)
  }
}

onMounted(async () => {
  await Promise.all([
    refresh(),
    fetchWishlist(),
    fetchPredictions()
  ])
})
</script>
