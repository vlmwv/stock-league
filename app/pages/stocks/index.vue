<template>
  <div class="min-h-screen bg-bg-deep pb-32 overflow-x-hidden">
    <TopHeader />

    <main class="max-w-md mx-auto">
      <!-- 검색창 -->
      <section class="px-6 pt-8 pb-4">
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
      <section class="px-6 mb-4">
        <div class="flex p-1 bg-slate-800/50 rounded-2xl border border-white/5 gap-1">
          <button
            v-for="tab in sortTabs"
            :key="tab.key"
            @click="currentSort = tab.key"
            class="flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 leading-tight px-0.5 whitespace-nowrap"
            :class="currentSort === tab.key ? 'bg-brand-primary text-slate-900 shadow-xl' : 'text-slate-500 hover:text-slate-300'"
          >
            {{ tab.label }}
          </button>
        </div>
      </section>

      <!-- 상세 필터 (코스피/코스닥) -->
      <section v-if="currentSort === 'marketCap' || currentSort === 'volume'" class="px-6 mb-4 animate-fade-in">
        <div class="flex p-1 bg-slate-800/30 rounded-xl border border-white/5 gap-1 w-fit mx-auto">
          <button
            v-for="m in marketTabs"
            :key="m.key"
            @click="currentMarket = m.key"
            class="px-5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-300"
            :class="currentMarket === m.key ? 'bg-slate-700 text-brand-primary shadow-lg' : 'text-slate-500 hover:text-slate-300'"
          >
            {{ m.label }}
          </button>
        </div>
      </section>

      <!-- 상세 필터 (관심 폴더) -->
      <section v-if="currentSort === 'interested' && wishlistGroups.length > 0" class="px-6 mb-4 animate-fade-in">
        <div class="flex gap-2 overflow-x-auto pb-2 no-scrollbar -mx-6 px-6">
          <button
            @click="currentGroupId = null"
            class="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all duration-300 border whitespace-nowrap"
            :class="currentGroupId === null 
              ? 'bg-brand-primary text-slate-900 border-brand-primary shadow-lg shadow-brand-primary/20' 
              : 'bg-slate-800/50 text-slate-500 border-white/5 hover:bg-slate-700'"
          >
            전체
          </button>
          <button
            v-for="group in wishlistGroups"
            :key="group.id"
            @click="currentGroupId = group.id"
            class="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all duration-300 border whitespace-nowrap flex items-center gap-1.5"
            :class="currentGroupId === group.id 
              ? 'bg-slate-100 text-slate-900 border-slate-100 shadow-lg' 
              : 'bg-slate-800/50 text-slate-500 border-white/5 hover:bg-slate-700'"
          >
            <UIcon :name="group.icon || 'i-heroicons-folder'" class="w-3 h-3" />
            {{ group.name }}
          </button>
        </div>
      </section>

      <!-- 종목 수 표시 -->
      <section class="px-6 mb-4 flex justify-between items-center">
        <p v-if="totalCount > 0" class="text-[10px] font-black text-slate-500 uppercase tracking-widest">
          전체 <span class="text-brand-primary">{{ totalCount.toLocaleString() }}</span>개 종목
        </p>
      </section>

      <!-- 종목 목록 -->
      <section class="px-6 space-y-3 animate-fade-in">
        <div v-if="isLoading && allStocks.length === 0" class="flex items-center justify-center py-20">
          <div class="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
        </div>

        <div v-else-if="allStocks.length === 0" class="flex flex-col items-center justify-center py-20 text-center">
          <UIcon name="i-heroicons-magnifying-glass-20-solid" class="w-12 h-12 text-slate-700 mb-4" />
          <p class="text-sm text-slate-500 font-medium">
            {{ searchQuery ? `"${searchQuery}" 검색 결과가 없습니다.` : '종목 데이터가 없습니다.' }}
          </p>
        </div>

        <template v-else>
          <div
            v-for="(stock, index) in allStocks"
            :key="stock.id"
            @click="navigateTo('/stocks/' + stock.code)"
            class="glass-dark rounded-3xl p-5 border border-white/5 flex items-center gap-4 group hover:bg-white/5 transition-colors cursor-pointer"
          >
            <!-- 아이콘 -->
            <StockIcon :code="stock.code" :name="stock.name" size="md" />

            <!-- 종목 정보 -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-[10px] font-black text-slate-500/80 mr-0.5">{{ (page - 1) * pageSize + index + 1 }}.</span>
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
                <span v-else-if="currentSort === 'aiRecommendation'" class="text-[10px] text-brand-primary flex items-center gap-0.5">
                  <UIcon name="i-heroicons-hand-thumb-up-20-solid" class="w-3 h-3" />
                  {{ stock.ai_recommendation_count ?? 0 }}회 추천
                </span>
                <span v-else-if="currentSort === 'volume'" class="text-[10px] text-slate-500 flex items-center gap-0.5">
                  <UIcon name="i-heroicons-chart-bar-20-solid" class="w-3 h-3 text-slate-500/60" />
                  {{ formatVolume(stock.volume) }}
                </span>
              </div>
            </div>

            <!-- 액션 버튼 -->
            <div class="flex items-center gap-2 shrink-0">
              <button
                @click.stop="handleOpenModal(stock.id)"
                class="w-9 h-9 rounded-xl flex items-center justify-center transition-colors shadow-2xl"
                :class="isHearted(stock.id) ? 'bg-rose-500/10 text-rose-500 shadow-rose-500/10' : 'bg-slate-800 text-slate-600 hover:text-slate-400'"
              >
                <UIcon :name="isHearted(stock.id) ? 'i-heroicons-heart-20-solid' : 'i-heroicons-heart'" class="w-5 h-5" />
              </button>
            </div>
          </div>

          <!-- 무한 스크롤 감지 요소 & 로딩 스피너 -->
          <div ref="sentinel" class="py-10 flex justify-center items-center">
            <div v-if="isFetchingMore" class="w-6 h-6 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin"></div>
            <p v-else-if="!hasMore && allStocks.length > 0" class="text-[10px] text-slate-600 font-black uppercase tracking-widest opacity-40">마지막 종목입니다</p>
          </div>
        </template>
      </section>
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
const route = useRoute()
const { hearts, toggleHeart, fetchWishlist, fetchStocksWithStats, wishlistsWithGroups, wishlistGroups, fetchWishlistGroups } = useStock()

const isGroupModalOpen = ref(false)
const selectedStockId = ref<number | null>(null)
const currentGroupId = ref<number | null>(null)
const currentStockGroupIds = computed(() => {
  if (!selectedStockId.value) return []
  return wishlistsWithGroups.value
    .filter(w => w.stock_id === selectedStockId.value)
    .map(w => w.group_id)
})

const handleOpenModal = (id: number) => {
  selectedStockId.value = id
  isGroupModalOpen.value = true
}

const searchQuery = ref('')
const currentSort = ref<'marketCap' | 'wishlist' | 'prediction' | 'aiRecommendation' | 'interested' | 'volume'>('marketCap')
const currentMarket = ref<'ALL' | 'KOSPI' | 'KOSDAQ'>('ALL')
const isLoading = ref(true)
const allStocks = ref<any[]>([])

// 페이징 상태
const page = ref(1)
const pageSize = 20
const totalCount = ref(0)
const hasMore = ref(true)
const isFetchingMore = ref(false)
const sentinel = ref<HTMLElement | null>(null)

const sortTabs = [
  { key: 'marketCap', label: '시가총액' },
  { key: 'volume', label: '거래량' },
  { key: 'interested', label: '관심' },
  { key: 'wishlist', label: '찜 순' },
  { key: 'prediction', label: '예측 성공' },
  { key: 'aiRecommendation', label: 'AI 추천' }
] as const

const marketTabs = [
  { key: 'ALL', label: '전체' },
  { key: 'KOSPI', label: '코스피' },
  { key: 'KOSDAQ', label: '코스닥' }
] as const

const isHearted = (id: number) => hearts.value.includes(Number(id))

const handleToggleHeart = async (stockId: number) => {
  const wasHearted = isHearted(stockId)
  await toggleHeart(stockId)
  const nowHearted = isHearted(stockId)
  
  if (wasHearted !== nowHearted) {
    const stock = allStocks.value.find(s => s.id === stockId)
    if (stock) {
      stock.wishlist_count = Math.max(0, (stock.wishlist_count || 0) + (nowHearted ? 1 : -1))
    }
    
    // 관심 탭인 경우 목록에서 제거 (선택 사항이나 보통은 즉시 반영 선호)
    if (currentSort.value === 'interested' && !nowHearted) {
       allStocks.value = allStocks.value.filter(s => s.id !== stockId)
       totalCount.value = Math.max(0, totalCount.value - 1)
    }
  }
}

const loadStocks = async (isAppend = false) => {
  try {
    if (!isAppend) {
      isLoading.value = true
      page.value = 1
      hasMore.value = true
    } else {
      isFetchingMore.value = true
    }

    const sortMap: Record<string, 'market_cap_rank' | 'wishlist_count' | 'win_count' | 'ai_recommendation_count' | 'volume'> = {
      marketCap: 'market_cap_rank',
      interested: 'market_cap_rank', // 관심 탭도 시총순으로 정렬
      wishlist: 'wishlist_count',
      prediction: 'win_count',
      aiRecommendation: 'ai_recommendation_count',
      volume: 'volume'
    }
    
    const response = await fetchStocksWithStats(
      sortMap[currentSort.value], 
      page.value, 
      pageSize, 
      searchQuery.value,
      currentSort.value === 'interested',
      currentMarket.value,
      currentGroupId.value // 그룹 ID 추가
    )
    
    const newData = response.data || []
    totalCount.value = response.count || 0

    if (isAppend) {
      allStocks.value = [...allStocks.value, ...newData]
    } else {
      allStocks.value = newData
    }

    // 더 가져올 데이터가 있는지 확인
    if (newData.length < pageSize || allStocks.value.length >= totalCount.value) {
      hasMore.value = false
    }
  } catch (err) {
    console.error('[Stocks] Failed to load stocks:', err)
  } finally {
    isLoading.value = false
    isFetchingMore.value = false
  }
}

const formatVolume = (vol: number | undefined) => {
  if (!vol) return '0'
  if (vol >= 100000000) {
    return `${(vol / 100000000).toFixed(1)}억`
  }
  if (vol >= 10000) {
    return `${(vol / 10000).toFixed(1)}만`
  }
  return vol.toLocaleString()
}

const loadMore = () => {
  if (!hasMore.value || isFetchingMore.value || isLoading.value) return
  page.value++
  loadStocks(true)
}

// 검색어 변경 감지 (Debounce)
let searchTimeout: any = null
watch(searchQuery, () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    loadStocks()
  }, 400)
})

// 정렬 탭 변경 시 데이터 다시 불러오기
watch(currentSort, () => {
  currentMarket.value = 'ALL'
  currentGroupId.value = null // 정렬 변경 시 그룹 필터 초기화
  loadStocks()
})

// 상세 필터 변경 시 데이터 다시 불러오기
watch(currentMarket, () => {
  loadStocks()
})

// 관심 그룹 변경 시 데이터 다시 불러오기
watch(currentGroupId, () => {
  loadStocks()
})

// Intersection Observer 설정 (VueUse 사용)
useIntersectionObserver(
  sentinel,
  ([entry]) => {
    if (entry?.isIntersecting) {
      loadMore()
    }
  },
  { rootMargin: '200px' }
)

onMounted(() => {
  // URL 쿼리 파라미터(tab)가 있으면 해당 탭 활성화
  const tab = route.query.tab as string
  if (tab && sortTabs.some(t => t.key === tab)) {
    currentSort.value = tab as any
  }

  // 찜 목록과 종목 리스트를 병렬로 로드하여 초기 로딩 성능 개선
  Promise.all([
    fetchWishlist(),
    fetchWishlistGroups(),
    loadStocks()
  ])
})
</script>

<style scoped>
.glass-dark {
background: rgba(15, 23, 42, 0.6);
backdrop-filter: blur(20px);
-webkit-backdrop-filter: blur(20px);
}

.animate-fade-in {
animation: fade-in 0.4s ease-out;
}
@keyframes fade-in {
from { opacity: 0; transform: translateY(8px); }
to { opacity: 1; transform: translateY(0); }
}
</style>
