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
      <section class="px-6 mb-4">
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
            <!-- 순위 -->
            <div class="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center text-xs font-black border border-white/5 shrink-0"
              :class="index < 3 && currentSort === 'marketCap' && page === 1 ? 'text-brand-primary border-brand-primary/30' : 'text-slate-400'"
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
                <span v-else-if="currentSort === 'aiRecommendation'" class="text-[10px] text-slate-600 flex items-center gap-0.5">
                  <UIcon name="i-heroicons-sparkles-20-solid" class="w-3 h-3 text-orange-400/60" />
                  {{ stock.ai_recommendation_count ?? 0 }}회
                </span>
              </div>
            </div>

            <!-- 액션 버튼 -->
            <div class="flex items-center gap-2 shrink-0">
              <NuxtLink
                :to="'/stocks/' + stock.code"
                class="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors border border-white/5"
              >
                <UIcon name="i-heroicons-plus-20-solid" class="w-5 h-5" />
              </NuxtLink>
              <button
                @click.stop="handleToggleHeart(stock.id)"
                class="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
                :class="isHearted(stock.id) ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-800 text-slate-600 hover:text-slate-400'"
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
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { hearts, toggleHeart, fetchWishlist, fetchStocksWithStats } = useStock()

const searchQuery = ref('')
const currentSort = ref<'marketCap' | 'wishlist' | 'prediction' | 'aiRecommendation' | 'interested'>('marketCap')
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
  { key: 'interested', label: '관심' },
  { key: 'wishlist', label: '찜 순' },
  { key: 'prediction', label: '예측 성공' },
  { key: 'aiRecommendation', label: 'AI 추천' }
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

    const sortMap: Record<string, 'market_cap_rank' | 'wishlist_count' | 'win_count' | 'ai_recommendation_count'> = {
      marketCap: 'market_cap_rank',
      interested: 'market_cap_rank', // 관심 탭도 시총순으로 정렬
      wishlist: 'wishlist_count',
      prediction: 'win_count',
      aiRecommendation: 'ai_recommendation_count'
    }
    
    const response = await fetchStocksWithStats(
      sortMap[currentSort.value], 
      page.value, 
      pageSize, 
      searchQuery.value,
      currentSort.value === 'interested'
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
