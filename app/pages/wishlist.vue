<template>
  <div class="min-h-screen bg-bg-deep pb-32 overflow-x-hidden">
    <TopHeader />

    <main class="max-w-md mx-auto px-6 py-8">
      <div class="mb-4 flex justify-between items-end">
        <div>
          <h2 class="text-3xl font-black text-slate-100 tracking-tight mb-1">관심 종목</h2>
          <p class="text-xs text-slate-500 font-bold uppercase tracking-widest">Your Private Watchlist</p>
        </div>
        <div class="bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-full flex items-center gap-2">
           <UIcon name="i-heroicons-heart-20-solid" class="w-3.5 h-3.5 text-rose-500" />
           <span class="text-[10px] font-black text-rose-500 uppercase tracking-widest">{{ heartedStocks.length }} Stocks</span>
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
          v-for="stock in heartedStocks" 
          :key="stock.id"
          :stock="stock"
          :is-hearted="true"
          :prediction="getPrediction(stock.id)"
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
const { wishlistStocks, hearts, myPredictions, predict, toggleHeart, fetchWishlist, fetchPredictions } = useStock()

const heartedStocks = computed(() => wishlistStocks.value || [])

const isResultOpen = ref(false)
const selectedStockName = ref('')
const selectedPrediction = ref<'up' | 'down' | null>(null)

const getPrediction = (id: number) => myPredictions.value.find(p => p.stockId === id)?.prediction || null

const onPredict = (id: number, prediction: 'up' | 'down') => {
  const stock = (wishlistStocks.value || []).find((s: any) => s.id === id)
  if (stock) {
    predict(id, prediction)
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
    fetchWishlist(),
    fetchPredictions()
  ])
})
</script>
