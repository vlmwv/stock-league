<template>
  <div class="min-h-screen bg-bg-deep pb-32 overflow-x-hidden">
    <TopHeader />

    <main class="max-w-md mx-auto">
      <!-- 헤더 -->
      <section class="px-6 pt-8 pb-4">
        <h2 class="text-3xl font-black text-slate-100 tracking-tight mb-1">종목</h2>
        <p class="text-xs text-slate-500 font-bold uppercase tracking-widest">Stock List</p>
      </section>

      <!-- 검색창 -->
      <section class="px-6 mb-4">
        <div class="relative">
          <UIcon name="i-heroicons-magnifying-glass-20-solid" class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="종목명 또는 코드 검색..."
            class="w-full bg-slate-800/60 border border-white/5 rounded-2xl pl-11 pr-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-primary/50 focus:bg-slate-800 transition-all"
          />
          <button
            v-if="searchQuery"
            @click="searchQuery = ''"
            class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
          >
            <UIcon name="i-heroicons-x-circle-20-solid" class="w-4 h-4" />
          </button>
        </div>
      </section>

      <!-- 정렬 탭 -->
      <section class="px-6 mb-6">
        <div class="flex p-1 bg-slate-800/50 rounded-2xl border border-white/5 gap-1">
          <button
            v-for="tab in sortTabs"
            :key="tab.key"
            @click="currentSort = tab.key"
            class="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 leading-tight px-1"
            :class="currentSort === tab.key ? 'bg-brand-primary text-slate-900 shadow-xl' : 'text-slate-500 hover:text-slate-300'"
          >
            {{ tab.label }}
          </button>
        </div>
      </section>

      <!-- 종목 목록 -->
      <section class="px-6 space-y-3 animate-fade-in">
        <div v-if="isLoading" class="flex items-center justify-center py-20">
          <div class="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
        </div>

        <div v-else-if="filteredStocks.length === 0" class="flex flex-col items-center justify-center py-20 text-center">
          <UIcon name="i-heroicons-magnifying-glass-20-solid" class="w-12 h-12 text-slate-700 mb-4" />
          <p class="text-sm text-slate-500 font-medium">
            {{ searchQuery ? `"${searchQuery}" 검색 결과가 없습니다.` : '종목 데이터가 없습니다.' }}
          </p>
        </div>

        <div
          v-else
          v-for="(stock, index) in filteredStocks"
          :key="stock.id"
          @click="navigateTo('/stocks/' + stock.id)"
          class="glass-dark rounded-3xl p-5 border border-white/5 flex items-center gap-4 group hover:bg-white/5 transition-colors cursor-pointer"
        >
          <!-- 순위 -->
          <div class="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center text-xs font-black border border-white/5 shrink-0"
            :class="index < 3 ? 'text-brand-primary border-brand-primary/30' : 'text-slate-400'"
          >
            {{ index + 1 }}
          </div>

          <!-- 종목 정보 -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <h4 class="font-bold text-slate-200 truncate text-sm sm:text-base">{{ stock.name }}</h4>
              <span class="text-[9px] font-bold text-slate-600 uppercase shrink-0">{{ stock.code }}</span>
            </div>
            <div class="flex items-center gap-3 mt-1">
              <span class="text-xs font-bold text-slate-300">{{ stock.last_price.toLocaleString() }}</span>
              <span
                class="text-[10px] font-black"
                :class="stock.change_amount >= 0 ? 'text-rose-400' : 'text-indigo-400'"
              >
                {{ stock.change_amount >= 0 ? '+' : '' }}{{ stock.change_rate }}%
              </span>
              <!-- 정렬 기준별 보조 정보 -->
              <span v-if="currentSort === 'wishlist'" class="text-[10px] text-slate-600 flex items-center gap-0.5">
                <UIcon name="i-heroicons-heart-20-solid" class="w-3 h-3 text-rose-500/60" />
                {{ stock.wishlist_count ?? 0 }}
              </span>
              <span v-else-if="currentSort === 'prediction'" class="text-[10px] text-slate-600 flex items-center gap-0.5">
                <UIcon name="i-heroicons-check-circle-20-solid" class="w-3 h-3 text-brand-primary/60" />
                {{ stock.win_count ?? 0 }}
              </span>
            </div>
          </div>

          <!-- 액션 버튼 -->
          <div class="flex items-center gap-2 shrink-0">
            <button
              @click.stop="handleToggleHeart(stock.id)"
              class="w-10 h-10 rounded-2xl flex items-center justify-center transition-colors"
              :class="isHearted(stock.id) ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-800 text-slate-600 hover:text-slate-400'"
            >
              <UIcon :name="isHearted(stock.id) ? 'i-heroicons-heart-20-solid' : 'i-heroicons-heart'" class="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>
    </main>

    <BottomNav />
  </div>
</template>

<script setup lang="ts">
const { hearts, toggleHeart, fetchWishlist, fetchStocksWithStats } = useStock()

const searchQuery = ref('')
const currentSort = ref<'marketCap' | 'wishlist' | 'prediction'>('marketCap')
const isLoading = ref(true)
const allStocks = ref<any[]>([])

const sortTabs = [
  { key: 'marketCap', label: '시가총액' },
  { key: 'wishlist', label: '찜 많은 순' },
  { key: 'prediction', label: '예측 성공 순' }
] as const

const isHearted = (id: number) => hearts.value.includes(id)

const handleToggleHeart = async (stockId: number) => {
  const wasHearted = isHearted(stockId)
  await toggleHeart(stockId)
  const nowHearted = isHearted(stockId)
  
  // 성공적으로 토글된 경우 로컬 카운트 업데이트
  if (wasHearted !== nowHearted) {
    const stock = allStocks.value.find(s => s.id === stockId)
    if (stock) {
      stock.wishlist_count = Math.max(0, (stock.wishlist_count || 0) + (nowHearted ? 1 : -1))
    }
  }
}

const filteredStocks = computed(() => {
  let list = [...allStocks.value]

  // 검색 필터
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(s =>
      s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
    )
  }

  // 정렬
  if (currentSort.value === 'marketCap') {
    list.sort((a, b) => (a.market_cap_rank ?? 9999) - (b.market_cap_rank ?? 9999))
  } else if (currentSort.value === 'wishlist') {
    list.sort((a, b) => (b.wishlist_count ?? 0) - (a.wishlist_count ?? 0))
  } else if (currentSort.value === 'prediction') {
    list.sort((a, b) => (b.win_count ?? 0) - (a.win_count ?? 0))
  }

  return list
})

onMounted(async () => {
  try {
    isLoading.value = true
    await fetchWishlist()
    const data = await fetchStocksWithStats()
    allStocks.value = data || []
  } catch (err) {
    console.error('[Stocks] Failed to load stocks:', err)
  } finally {
    isLoading.value = false
  }
})
</script>

<style scoped>
.animate-fade-in {
  animation: fade-in 0.4s ease-out;
}
@keyframes fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
