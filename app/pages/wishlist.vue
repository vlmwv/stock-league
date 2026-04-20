<template>
  <div class="min-h-screen bg-bg-deep pb-32 overflow-x-hidden selection:bg-brand-primary/30">
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
          <p class="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] pl-13">Folder & Group Customization</p>
        </div>
      </div>

      <!-- Folder Tabs -->
      <div class="flex gap-2 overflow-x-auto pb-4 no-scrollbar -mx-6 px-6 mb-6">
        <button 
          @click="selectedGroupId = null"
          class="px-5 h-10 rounded-full text-xs font-bold transition-all whitespace-nowrap border flex items-center justify-center"
          :class="selectedGroupId === null 
            ? 'bg-brand-primary text-slate-900 border-brand-primary shadow-lg shadow-brand-primary/20' 
            : 'bg-slate-800 text-slate-400 border-white/5 hover:bg-slate-700'"
        >
          전체
        </button>
        <div 
          v-for="group in wishlistGroups" 
          :key="group.id"
          class="relative flex-shrink-0 group/tab"
        >
          <button 
            @click="selectedGroupId = group.id"
            class="px-5 h-10 rounded-full text-xs font-bold transition-all whitespace-nowrap border flex items-center justify-center gap-2"
            :class="selectedGroupId === group.id 
              ? 'bg-slate-100 text-slate-900 border-slate-100 shadow-xl' 
              : 'bg-slate-800 text-slate-400 border-white/5 hover:bg-slate-700'"
          >
            <UIcon :name="group.icon || 'i-heroicons-folder'" class="w-3.5 h-3.5" />
            {{ group.name }}
          </button>
          
          <!-- Delete button for custom folders (not '기본 폴더') -->
          <button 
            v-if="group.name !== '기본 폴더' && selectedGroupId === group.id"
            @click.stop="handleDeleteGroup(group)"
            class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg transform transition-transform border border-slate-900"
          >
            <UIcon name="i-heroicons-x-mark-20-solid" class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="filteredStocks.length === 0" class="flex flex-col items-center justify-center py-20 px-10 text-center animate-fade-in">
        <div class="w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center mb-6">
          <UIcon name="i-heroicons-heart" class="w-10 h-10 text-slate-700" />
        </div>
        <h3 class="text-lg font-black text-slate-300 mb-2 tracking-tight">
          {{ selectedGroupId ? '이 폴더에 종목이 없습니다.' : '찜한 종목이 없습니다.' }}
        </h3>
        <p class="text-xs text-slate-500 font-medium leading-relaxed">
          {{ selectedGroupId ? '다른 폴더를 확인하거나, 종목을 이 폴더에 추가해 보세요.' : '검기 화면이나 종목 정보에서 하트 아이콘을 클릭하여 관심 종목에 추가해 보세요!' }}
        </p>
        <NuxtLink 
          to="/"
          class="mt-8 px-8 py-4 rounded-2xl bg-brand-primary text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-brand-primary/20 hover:scale-105 transition-transform"
        >
          종목 찾으러 가기
        </NuxtLink>
      </div>

      <!-- Wishlist Stack -->
      <div v-else class="space-y-6 mt-4">
        <StockCard 
          v-for="(stock, idx) in filteredStocks" 
          :key="stock.id"
          :stock="stock"
          :is-hearted="hearts.includes(Number(stock.id))"
          :is-league-open="isLeagueOpen"
          :is-predictable="isLeagueStock(stock.id)"
          :prediction="getPredictionValue(stock.id)"
          :is-top="idx === 0"
          :index="idx"
          @predict="onPredict"
          @open-wishlist-modal="handleOpenModal"
          @cancel-prediction="cancelPrediction"
        />
      </div>
    </main>

    <BottomNav />

    <WishlistGroupModal 
      v-model:open="isGroupModalOpen"
      :stock-id="selectedStockId"
      :initial-group-ids="currentStockGroupIds"
    />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

const router = useRouter()
const { dailyStocks, wishlistStocks, hearts, myPredictions, predict, toggleHeart, fetchWishlist, fetchPredictions, isLeagueOpen, refresh, wishlistGroups, wishlistsWithGroups, fetchWishlistGroups, deleteWishlistGroup, getPredictionValue } = useStock()

const selectedGroupId = ref<number | null>(null)
const isGroupModalOpen = ref(false)
const selectedStockId = ref<number | null>(null)

const filteredStocks = computed(() => {
  if (!wishlistStocks.value) return []
  if (selectedGroupId.value === null) return wishlistStocks.value
  
  return (wishlistStocks.value as any[]).filter(stock => {
    return stock.group_ids && stock.group_ids.includes(selectedGroupId.value)
  })
})

const currentStockGroupIds = computed(() => {
  if (!selectedStockId.value) return []
  return wishlistsWithGroups.value
    .filter(w => w.stock_id === selectedStockId.value)
    .map(w => w.group_id)
})

const isLeagueStock = (id: number) => dailyStocks.value?.some((s: any) => s.id === id) || false

const handleOpenModal = (id: number) => {
  selectedStockId.value = id
  isGroupModalOpen.value = true
}

const onPredict = (id: number, prediction: 'up' | 'down') => {
  const stock = (wishlistStocks.value || []).find((s: any) => s.id === id)
  if (stock) {
    if (!isLeagueStock(id)) return
    predict(id, prediction, (stock as any).game_date || new Date().toISOString().split('T')[0])
  }
}

const cancelPrediction = (id: number) => {
  const index = myPredictions.value.findIndex(p => p.stockId === id)
  if (index > -1) {
    myPredictions.value.splice(index, 1)
  }
}

const handleDeleteGroup = async (group: any) => {
  if (confirm(`'${group.name}' 폴더를 삭제하시겠습니까? 안에 담긴 종목은 사라지지 않습니다.`)) {
    const result = await deleteWishlistGroup(group.id)
    if (result.success) {
      selectedGroupId.value = null
    }
  }
}

onMounted(async () => {
  await Promise.all([
    refresh(),
    fetchWishlist(),
    fetchPredictions(),
    fetchWishlistGroups()
  ])
})
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.animate-fade-in {
  animation: fade-in 0.5s cubic-bezier(0.2, 0, 0.2, 1);
}
@keyframes fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
