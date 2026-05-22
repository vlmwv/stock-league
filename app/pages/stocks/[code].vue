<template>
  <div class="min-h-screen bg-bg-deep pb-12 overflow-x-hidden">
    <div class="max-w-md mx-auto relative">
      <!-- 상단 액션 바 -->
      <nav class="sticky top-0 z-40 px-5 py-3 flex items-center justify-between bg-bg-deep/80 backdrop-blur-xl">
        <button @click="router.back()" class="w-10 h-10 rounded-2xl bg-slate-800/50 flex items-center justify-center text-slate-400 hover:text-slate-100 transition-colors">
          <UIcon name="i-heroicons-chevron-left-20-solid" class="w-6 h-6" />
        </button>
        <div class="flex items-center gap-2">
          <button
            v-if="stock"
            @click="handleToggleHeart"
            class="w-10 h-10 rounded-2xl flex items-center justify-center transition-colors px-1"
            :class="isHearted(stock.id) ? 'bg-rose-500/10 text-rose-500 shadow-lg shadow-rose-500/20' : 'bg-slate-800/50 text-slate-600 hover:text-slate-400'"
          >
            <UIcon :name="isHearted(stock.id) ? 'i-heroicons-heart-20-solid' : 'i-heroicons-heart'" class="w-5 h-5" />
          </button>
        </div>
      </nav>
      <WishlistGroupModal 
        v-model:open="isGroupModalOpen"
        :stock-id="stock?.id"
        :initial-group-ids="currentStockGroupIds"
      />
      <main v-if="stock" class="px-5 space-y-5 animate-fade-in pb-16">
        <!-- 종목 헤더 (Brand CI 포함) -->
        <header class="flex items-center gap-4">
          <StockIcon :code="stock.code" :name="stock.name" size="lg" class="shadow-lg border border-white/5 flex-shrink-0" />
          <div class="flex-1 min-w-0">
            <!-- 1행: 종목명, 현재가 -->
            <div class="flex items-center justify-between gap-2">
              <h1 class="text-xl font-black text-slate-100 tracking-tight truncate">{{ stock.name }}</h1>
              <div class="text-xl font-black text-slate-100 whitespace-nowrap">{{ stock.last_price?.toLocaleString() }}</div>
            </div>
            
            <!-- 2행: 종목코드, 코스피/코스닥, 업종, 금일변동금액(비율) -->
            <div class="flex items-center justify-between text-[11px] font-bold mt-1">
              <div class="flex items-center gap-2">
                <span class="text-slate-500">{{ stock.code }}</span>
                <span v-if="stock.market" class="text-slate-500 bg-white/5 px-1.5 py-0.5 rounded-md text-[10px]">{{ stock.market }}</span>
                <span v-if="stock.sector" class="text-slate-400">{{ stock.sector }}</span>
                <button @click="clearAiHistoryAndGoToTab" class="text-slate-500 hover:text-slate-300 transition-colors flex items-center">
                  <UIcon name="i-heroicons-clock" class="w-3.5 h-3.5" />
                </button>
              </div>
              
              <div :class="stock.change_amount >= 0 ? 'text-rose-400' : 'text-indigo-400'" class="whitespace-nowrap">
                {{ stock.change_amount >= 0 ? '▲' : '▼' }}{{ Math.abs(stock.change_amount).toLocaleString() }} 
                ({{ stock.change_amount >= 0 ? '+' : '' }}{{ stock.change_rate }}%)
              </div>
            </div>
          </div>
        </header>


        <!-- 차트 섹션 (이력 탭에서만 보일지 고민하다가, 공통 정보로 상단에 작게 배치하거나 이력 탭에만 넣기로 함. 여기서는 상단 유지) -->
        <section class="glass-dark rounded-[2.5rem] p-6 border border-white/5 relative overflow-hidden">
          <div class="flex items-center justify-between mb-8">
            <h3 class="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">주가 및 거래량</h3>
            <div class="flex items-center gap-3">
              <!-- 마커 체크박스 -->
              <label class="flex items-center gap-1.5 text-[10px] font-black text-slate-400 cursor-pointer bg-slate-850 hover:bg-slate-800 px-2.5 py-1 rounded-full border border-white/5 shadow transition-colors select-none">
                <input
                  type="checkbox"
                  v-model="showMarkers"
                  class="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-brand-primary focus:ring-brand-primary focus:ring-offset-slate-900"
                />
                <span>마커</span>
              </label>
              <div class="px-3 py-1 bg-slate-800/50 rounded-full border border-white/5 text-[10px] font-black text-slate-400">
                최근 50일
              </div>
            </div>
          </div>
          
          <div v-if="chartSeries.length > 0" class="space-y-2">
            <client-only>
              <!-- 1. 상단 캔들스틱 차트 -->
              <div class="h-[200px]">
                <apexchart
                  :key="`candlestick-${chartSeries.length}-${chartAnnotations.points.length}-${showMarkers}`"
                  type="candlestick"
                  height="200"
                  :options="chartOptions"
                  :series="chartSeries"
                />
              </div>
              <!-- 2. 하단 거래량 차트 -->
              <div class="h-[80px] border-t border-white/5 pt-2">
                <apexchart
                  :key="`volume-${volumeSeries.length}-${showMarkers}`"
                  type="bar"
                  height="80"
                  :options="volumeChartOptions"
                  :series="volumeSeries"
                />
              </div>
            </client-only>
          </div>
          <div v-else class="h-[280px] flex items-center justify-center text-slate-600 text-sm font-bold italic">
            충분한 가격 데이터가 없습니다.
          </div>
        </section>

        <!-- 정보 카드들 -->
        <div class="grid grid-cols-3 gap-3">
          <div class="glass-dark rounded-2xl p-4 border border-white/5 flex flex-col justify-between">
            <p class="text-[9px] font-black text-slate-500 uppercase tracking-[0.1em] mb-2">시총 순위</p>
            <p class="text-lg font-black text-slate-200">{{ stock.market_cap_rank || '-' }}위</p>
          </div>
          <div class="glass-dark rounded-2xl p-4 border border-white/5 flex flex-col justify-between">
            <p class="text-[9px] font-black text-slate-500 uppercase tracking-[0.1em] mb-2">찜한 사용자</p>
            <p class="text-lg font-black text-slate-200">{{ stock.wishlist_count || 0 }}명</p>
          </div>
          <div class="glass-dark rounded-2xl p-4 border border-white/5 flex flex-col justify-between group/card hover:bg-brand-primary/5 transition-all">
            <div class="flex items-center justify-between mb-2">
              <p class="text-[9px] font-black text-slate-500 uppercase tracking-[0.1em]">AI 추천</p>
              <UIcon name="i-heroicons-hand-thumb-up-20-solid" class="w-3.5 h-3.5 text-brand-primary/50 group-hover/card:text-brand-primary transition-colors" />
            </div>
            <p class="text-lg font-black text-slate-200">{{ stock.ai_recommendation_count || 0 }}회</p>
          </div>
        </div>

        <!-- 탭 전환 시스템 -->
        <div class="space-y-6">
          <div class="flex p-1 bg-slate-800/50 rounded-2xl border border-white/5 gap-1">
            <button
              v-for="tab in tabs"
              :key="tab.key"
              @click="activeTab = tab.key"
              class="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300"
              :class="activeTab === tab.key ? 'bg-brand-primary text-slate-900 shadow-xl' : 'text-slate-500 hover:text-slate-300'"
            >
              {{ tab.label }}
            </button>
          </div>

          <!-- 탭 콘텐츠: 주가 이력 -->
          <div v-if="activeTab === 'history'" class="space-y-4 animate-fade-in">
            <h3 class="text-xs font-black text-slate-400 uppercase tracking-[0.2em] px-2">주가 이력</h3>
            <div class="space-y-3">
              <div v-for="item in priceHistory" :key="item.price_date" class="glass-dark rounded-2xl p-4 border border-white/5 flex flex-col gap-2">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-xs font-bold text-slate-200">{{ formatPriceDate(item.price_date) }}</p>
                    <p class="text-[10px] text-slate-500 mt-0.5">{{ item.price_date }}</p>
                  </div>
                  <div class="text-right">
                    <p class="text-sm font-black text-slate-200">{{ item.close_price?.toLocaleString() }}원</p>
                    <p class="text-[10px] font-black" :class="item.change_amount >= 0 ? 'text-rose-400' : 'text-indigo-400'">
                      {{ item.change_amount >= 0 ? '▲' : '▼' }}{{ Math.abs(item.change_amount).toLocaleString() }} 
                      ({{ item.change_amount >= 0 ? '+' : '' }}{{ item.change_rate }}%)
                    </p>
                  </div>
                </div>
                <!-- OHLC 상세 정보 -->
                <div class="grid grid-cols-4 gap-1 pt-2 border-t border-white/5 text-center text-[10px] font-bold text-slate-400">
                  <div>
                    <span class="block text-[8px] text-slate-500 uppercase tracking-widest">시가</span>
                    <span class="text-slate-300 font-mono">{{ item.open_price !== null && item.open_price !== undefined ? item.open_price.toLocaleString() : item.close_price?.toLocaleString() }}</span>
                  </div>
                  <div>
                    <span class="block text-[8px] text-slate-500 uppercase tracking-widest">고가</span>
                    <span class="text-rose-400/80 font-mono">{{ item.high_price !== null && item.high_price !== undefined ? item.high_price.toLocaleString() : item.close_price?.toLocaleString() }}</span>
                  </div>
                  <div>
                    <span class="block text-[8px] text-slate-500 uppercase tracking-widest">저가</span>
                    <span class="text-indigo-400/80 font-mono">{{ item.low_price !== null && item.low_price !== undefined ? item.low_price.toLocaleString() : item.close_price?.toLocaleString() }}</span>
                  </div>
                  <div>
                    <span class="block text-[8px] text-slate-500 uppercase tracking-widest">종가</span>
                    <span class="text-slate-300 font-mono">{{ item.close_price?.toLocaleString() }}</span>
                  </div>
                </div>
              </div>
              
              <div v-if="priceHistory.length === 0" class="py-12 text-center">
                <p class="text-sm text-slate-600 font-medium italic">가격 기록이 없습니다.</p>
              </div>
            </div>
          </div>

          <!-- 탭 콘텐츠: 종목 뉴스 -->
          <div v-else-if="activeTab === 'news'" class="space-y-4 animate-fade-in">
            <div v-if="isNewsLoading" class="flex flex-col items-center justify-center py-12 gap-4">
              <div class="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
              <p class="text-[10px] text-slate-500 font-black uppercase tracking-widest animate-pulse">데이터 로드 중...</p>
            </div>
            
            <div v-else-if="currentNewsItems.length === 0" class="py-20 text-center flex flex-col items-center justify-center glass-dark rounded-3xl border border-dashed border-white/10">
              <UIcon name="i-heroicons-newspaper" class="w-12 h-12 text-slate-800 mb-4" />
              <p class="text-sm text-slate-600 font-medium italic">등록된 뉴스가 없습니다.</p>
            </div>

            <div v-else class="space-y-4">
              <div
                v-for="item in currentNewsItems"
                :key="item.id"
                @click="navigateToNews(item)"
                class="bg-white/5 rounded-[1.5rem] p-5 border border-white/5 group hover:bg-white/10 transition-all cursor-pointer relative overflow-hidden active:scale-[0.98]"
              >
                <div class="flex flex-col gap-3.5 relative z-10">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2.5">
                      <span class="text-[10px] text-slate-400 font-black uppercase tracking-widest">{{ item.source }}</span>
                    </div>
                    <span class="text-[10px] text-slate-500 font-bold opacity-70">{{ formatNewsDate(item.published_at) }}</span>
                  </div>

                  <h4 class="font-bold text-slate-100 text-[15px] leading-snug group-hover:text-brand-primary transition-colors line-clamp-2">
                    {{ item.title }}
                  </h4>

                  <div v-if="item.llm_summary" class="bg-indigo-500/[0.04] rounded-xl p-3.5 border border-white/5">
                    <p class="text-[11px] text-slate-400 leading-relaxed font-medium">
                      <span class="text-brand-primary/80 font-black mr-1.5 uppercase text-[9px]">AI 요약</span>
                      {{ item.llm_summary }}
                    </p>
                  </div>
                </div>
                <div class="absolute -bottom-10 -right-10 w-24 h-24 bg-brand-secondary/5 blur-[40px] rounded-full group-hover:bg-brand-secondary/10 transition-colors"></div>
              </div>
            </div>
          </div>

          <!-- 탭 콘텐츠: AI 추천 이력 -->
          <div v-else class="space-y-4 animate-fade-in">
            <div v-if="isAiHistoryLoading" class="flex flex-col items-center justify-center py-12 gap-4">
              <div class="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
              <p class="text-[10px] text-slate-500 font-black uppercase tracking-widest animate-pulse">데이터 로드 중...</p>
            </div>

            <div v-else-if="aiHistory.length === 0" class="py-20 text-center flex flex-col items-center justify-center glass-dark rounded-3xl border border-dashed border-white/10">
              <UIcon name="i-heroicons-sparkles" class="w-12 h-12 text-slate-800 mb-4" />
              <p class="text-sm text-slate-600 font-medium italic">추천 이력이 없습니다.</p>
            </div>

            <div v-else class="space-y-4">
              <div
                v-for="item in aiHistory"
                :key="item.game_date"
                class="glass-dark rounded-[2rem] p-6 border border-white/5 relative overflow-hidden group"
              >
                <!-- 카드 배경 글로우 -->
                <div 
                  class="absolute -top-12 -right-12 w-32 h-32 blur-3xl rounded-full transition-all duration-700 opacity-20 group-hover:opacity-40"
                  :class="item.cumulative_change_rate >= 0 ? 'bg-rose-500' : 'bg-indigo-500'"
                ></div>

                <div class="relative z-10">
                  <!-- 날짜 및 상단 정보 -->
                  <div class="flex items-center justify-between mb-6">
                    <div class="flex flex-col gap-1">
                      <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest">추천 시점</span>
                      <h4 class="text-sm font-black text-slate-200">{{ formatPriceDate(item.game_date) }}</h4>
                    </div>
                    <div class="px-3 py-1 bg-white/5 rounded-full border border-white/10">
                      <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">AI 점수: {{ item.ai_score }}P</span>
                    </div>
                  </div>

                  <!-- 가격 정보 비교 -->
                  <div class="grid grid-cols-2 gap-4 mb-6">
                    <div class="space-y-1">
                      <p class="text-[9px] font-black text-slate-500 uppercase tracking-widest">추천 시점 가격</p>
                      <p class="text-lg font-black text-slate-300 tracking-tight">{{ item.rec_price?.toLocaleString() }}원</p>
                    </div>
                    <div class="space-y-1 text-right">
                      <p class="text-[9px] font-black text-slate-500 uppercase tracking-widest">현재 가격</p>
                      <p class="text-lg font-black text-slate-100 tracking-tight">{{ item.last_price?.toLocaleString() }}원</p>
                    </div>
                  </div>

                  <!-- 수익률 하이라이트 -->
                  <div 
                    class="rounded-2xl p-5 border transition-all duration-500 flex flex-col items-center justify-center gap-1 shadow-2xl"
                    :class="item.days_passed <= 0 
                      ? 'bg-slate-500/10 border-slate-500/20 text-slate-400 shadow-slate-500/5'
                      : (item.cumulative_change_rate >= 0 
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-400 shadow-rose-500/5' 
                        : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 shadow-indigo-500/5')"
                  >

                    <div class="flex items-center gap-2">
                      <UIcon 
                        v-if="item.days_passed > 0"
                        :name="item.cumulative_change_rate >= 0 ? 'i-heroicons-arrow-trending-up-20-solid' : 'i-heroicons-arrow-trending-down-20-solid'" 
                        class="w-6 h-6" 
                      />
                      <UIcon 
                        v-else
                        name="i-heroicons-clock" 
                        class="w-5 h-5 opacity-50" 
                      />
                      <span class="text-3xl font-black tracking-tighter">
                        {{ item.days_passed <= 0 ? '-' : (item.cumulative_change_rate > 0 ? '+' : '') + item.cumulative_change_rate + '%' }}
                      </span>
                    </div>
                    <p class="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">
                      {{ item.days_passed <= 0 ? '결과 대기 중' : '예상 수익률' }}
                    </p>
                  </div>

                  <!-- 목표가 정보 추가 -->
                  <div v-if="item.target_price" class="mt-6 grid grid-cols-2 gap-4 py-4 px-5 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                    <div class="space-y-0.5">
                      <p class="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest">목표가</p>
                      <p class="text-sm font-black text-emerald-400 font-mono">{{ item.target_price.toLocaleString() }}원</p>
                    </div>
                    <div class="space-y-0.5 text-right">
                      <p class="text-[9px] font-black text-slate-500 uppercase tracking-widest">목표기한</p>
                      <p class="text-sm font-black text-slate-300">{{ item.target_date }}</p>
                    </div>
                  </div>


                  <!-- AI 요약 (접기/펼치기 대용으로 작게 표시) -->
                  <div v-if="item.summary" class="mt-6 pt-6 border-t border-white/5">
                    <p class="text-xs text-slate-400 leading-relaxed font-medium italic opacity-70 line-clamp-2">
                       "{{ item.summary }}"
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <!-- 로딩 상태 -->
      <div v-else class="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div class="w-10 h-10 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
        <p class="text-sm text-slate-500 font-bold animate-pulse uppercase tracking-widest">종목 정보 불러오는 중...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { repairNewsUrl } from '~/utils/stock'

const route = useRoute()
const router = useRouter()
const stock = ref<any>(null)
const priceHistory = ref<any[]>([])
const activeTab = ref('history')
const showMarkers = ref(true)
const tabs = [
  { key: 'history', label: '주가 이력' },
  { key: 'news', label: '종목 뉴스' },
  { key: 'ai_history', label: 'AI 추천' }
]

const newsItems = ref<any[]>([])
const isNewsLoading = ref(false)
const aiHistory = ref<any[]>([])
const isAiHistoryLoading = ref(false)

const { 
  fetchStockByCode, 
  fetchPriceHistory, 
  fetchNews, 
  hearts, 
  toggleHeart, 
  fetchWishlist,
  fetchAiHistory,
  wishlistsWithGroups
} = useStock()

const user = useSupabaseUser()


const isGroupModalOpen = ref(false)
const currentStockGroupIds = computed(() => {
  if (!stock.value) return []
  return wishlistsWithGroups.value
    .filter(w => w.stock_id === stock.value.id)
    .map(w => w.group_id)
})

// 현재 탭에 따른 뉴스 아이템 반환 (현재는 뉴스만 존재)
const currentNewsItems = computed(() => {
  return newsItems.value
})

const latestTargetPrice = computed(() => {
  if (aiHistory.value.length === 0) return null
  // 가장 최근 추천 정보의 목표가를 가져옴
  return aiHistory.value[0]?.target_price || null
})

const code = route.params.code as string

const loadAiHistory = async () => {
  if (!stock.value) return
  isAiHistoryLoading.value = true
  try {
    const result = await fetchAiHistory(1, 40, stock.value.id)
    aiHistory.value = result.items
  } finally {
    isAiHistoryLoading.value = false
  }
}
const clearAiHistoryAndGoToTab = () => {
  aiHistory.value = [];
  activeTab.value = 'ai_history';
};

// SSR 단계에서 종목 정보 로드
const { data: ssrStock } = await useAsyncData<any>(`stock-seo-${code}`, () => fetchStockByCode(code))
if (ssrStock.value) {
  const title = `[${ssrStock.value.name}] 니나노AI`
  const description = ssrStock.value.summary || '해당 종목의 상세 정보와 주가 예측을 확인해보세요.'
  
  useSeoMeta({
    title,
    ogTitle: title,
    description,
    ogDescription: description,
    ogUrl: `https://ninanoai.com/stocks/${code}`,
    twitterTitle: title,
    twitterDescription: description
  })
}

const formatPriceDate = (dateStr: string) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '-'
  return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }).format(d)
}

const formatNewsDate = (dateStr: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))

  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  if (hours < 24) return `${hours}시간 전`
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

const isHearted = (id: number) => hearts.value.includes(Number(id))

const handleToggleHeart = () => {
  isGroupModalOpen.value = true
}



const navigateToNews = (item: any) => {
  const url = repairNewsUrl(item.url, item.stockCode)
  if (url) {
    window.open(url, '_blank')
  }
}

// 뉴스 로드 함수
const loadStockContent = async () => {
  if (!stock.value) return
  isNewsLoading.value = true
  try {
    const { data } = await fetchNews(20, 1, 'news', stock.value.id)
    newsItems.value = data
  } finally {
    isNewsLoading.value = false
  }
}

const chartSeries = computed(() => {
  if (priceHistory.value.length === 0) return []
  const dataForChart = [...priceHistory.value].reverse()
  return [{
    name: '시세',
    data: dataForChart.map(h => {
      const open = h.open_price !== null && h.open_price !== undefined ? h.open_price : h.close_price
      const high = h.high_price !== null && h.high_price !== undefined ? h.high_price : h.close_price
      const low = h.low_price !== null && h.low_price !== undefined ? h.low_price : h.close_price
      const close = h.close_price
      return {
        x: new Date(h.price_date).getTime(),
        y: [open, high, low, close]
      }
    })
  }]
})

const volumeSeries = computed(() => {
  if (priceHistory.value.length === 0) return []
  const dataForChart = [...priceHistory.value].reverse()
  return [{
    name: '거래량',
    data: dataForChart.map(h => {
      const open = h.open_price !== null && h.open_price !== undefined ? h.open_price : h.close_price
      const close = h.close_price
      const isUp = close >= open
      return {
        x: new Date(h.price_date).getTime(),
        y: h.volume || 0,
        fillColor: isUp ? '#ef4444' : '#3b82f6'
      }
    })
  }]
})

const chartAnnotations = computed(() => {
  const ann: any = {
    yaxis: [],
    xaxis: [],
    points: []
  }

  // 1. 목표가 표시 (가장 최근 추천 기준)
  if (latestTargetPrice.value) {
    ann.yaxis.push({
      y: latestTargetPrice.value,
      borderColor: '#10b981', // Emerald 500
      strokeDashArray: 0, // 실선으로 변경
      borderWidth: 2,
      label: {
        borderColor: '#10b981',
        position: 'right',
        offsetX: -10,
        style: {
          color: '#fff',
          background: '#10b981',
          fontSize: '11px',
          fontWeight: 900,
          padding: { left: 8, right: 8, top: 4, bottom: 4 }
        },
        text: `🎯 목표가 ${latestTargetPrice.value.toLocaleString()}원`
      }
    })
  }

  // 2. 추천 시점 및 추천가 표시 (차트 범위 내)
  if (priceHistory.value.length > 0 && aiHistory.value.length > 0) {
    const dates = priceHistory.value.map(h => h.price_date)
    const minDate = dates[dates.length - 1]
    const maxDate = dates[0]

    aiHistory.value.forEach(item => {
      if (item.game_date >= minDate && item.game_date <= maxDate) {
        const timestamp = new Date(item.game_date).getTime()
        
        // 세로선 (추천 시점)
        ann.xaxis.push({
          x: timestamp,
          borderColor: '#6366f1', // Indigo 500
          strokeDashArray: 0, // 실선
          borderWidth: 2,
          label: {
            borderColor: '#6366f1',
            orientation: 'horizontal',
            offsetY: 0,
            style: {
              color: '#fff',
              background: '#6366f1',
              fontSize: '11px',
              fontWeight: 900,
              padding: { left: 8, right: 8, top: 4, bottom: 4 }
            },
            text: '✨ AI 추천'
          }
        })

        // 포인트 (추천가)
        if (item.rec_price) {
          ann.points.push({
            x: timestamp,
            y: item.rec_price,
            marker: {
              size: 6,
              fillColor: '#ffffff',
              strokeColor: '#6366f1',
              strokeWidth: 3,
              shape: "circle",
              radius: 4,
            },
            label: {
              borderColor: '#6366f1',
              offsetY: -5,
              style: {
                color: '#fff',
                background: '#6366f1',
                fontSize: '10px',
                fontWeight: 900,
                padding: { left: 5, right: 5, top: 2, bottom: 2 }
              },
              text: `추천가 ${item.rec_price.toLocaleString()}원`
            }
          })
        }
      }
    })
  }

  // 3. 주요 뉴스/이슈 마커 추가 (마커 체크박스가 켜져 있고 뉴스가 로드되었을 때)
  if (showMarkers.value && currentNewsItems.value.length > 0 && priceHistory.value.length > 0) {
    const dates = priceHistory.value.map(h => h.price_date)
    const minDate = dates[dates.length - 1]
    const maxDate = dates[0]

    // 날짜별 시세 정보 맵핑
    const priceMap = new Map<string, any>()
    priceHistory.value.forEach(h => {
      priceMap.set(h.price_date, h)
    })

    // 차트 범위 내 뉴스 필터링
    const filteredNews = currentNewsItems.value.filter(item => {
      if (!item.published_at) return false
      const newsDateStr = item.published_at.substring(0, 10)
      return newsDateStr >= minDate && newsDateStr <= maxDate
    })

    // 날짜별 뉴스 그룹핑
    const newsByDate = new Map<string, any[]>()
    filteredNews.forEach(item => {
      const dateStr = item.published_at.substring(0, 10)
      if (!newsByDate.has(dateStr)) {
        newsByDate.set(dateStr, [])
      }
      newsByDate.get(dateStr)!.push(item)
    })

    // 날짜별 마커 및 텍스트 생성
    newsByDate.forEach((items, dateStr) => {
      const historyItem = priceMap.get(dateStr)
      if (!historyItem) return

      const timestamp = new Date(dateStr).getTime()
      const high = historyItem.high_price !== null && historyItem.high_price !== undefined ? historyItem.high_price : historyItem.close_price

      items.forEach((news, index) => {
        // 최대 3개까지만 차트에 표시하여 너무 도배되지 않도록 함
        if (index >= 3) return 

        const priceScale = high > 0 ? high : 10000
        const offsetPercent = 0.035 + (index * 0.045) // 3.5%, 8%, 12.5% 순으로 위로 띄움
        const yValue = high + (priceScale * offsetPercent)

        const title = news.title || ''
        const isPositive = /상승|급등|호재|실적|기대|최대|돌파|수혜|흑자|AI|신제품|상한가/i.test(title)
        const isNegative = /하락|급락|악재|적자|우려|부진|감소|소송|하한가/i.test(title)
        
        let textColor = '#22c55e' // 기본 초록 (Green 500)
        let bgColor = '#0f172a'
        let borderColor = '#22c55e'

        if (isPositive) {
          textColor = '#f87171' // 빨강 (Red 400)
          borderColor = '#f87171'
        } else if (isNegative) {
          textColor = '#60a5fa' // 파랑 (Blue 400)
          borderColor = '#60a5fa'
        }

        ann.points.push({
          x: timestamp,
          y: yValue,
          marker: {
            size: 3,
            fillColor: textColor,
            strokeColor: '#0f172a',
            strokeWidth: 1,
            shape: 'circle'
          },
          label: {
            borderColor: borderColor,
            borderWidth: 1,
            borderRadius: 6,
            textAnchor: 'middle',
            offsetX: 0,
            offsetY: -3,
            style: {
              color: textColor,
              background: bgColor,
              fontSize: '8px',
              fontWeight: 700,
              padding: { left: 5, right: 5, top: 2.5, bottom: 2.5 }
            },
            text: title.length > 16 ? title.substring(0, 14) + '...' : title
          }
        })
      })
    })
  }

  return ann
})

const chartOptions = computed(() => ({
  chart: {
    id: 'stock-candlestick',
    group: 'stock-charts',
    type: 'candlestick',
    locales: [{
      name: 'ko',
      options: {
        months: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
        shortMonths: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
        days: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
        shortDays: ['일', '월', '화', '수', '목', '금', '토'],
        toolbar: {
          download: '이미지 다운로드',
          selection: '선택 영역',
          selectionZoom: '선택 영역 확대',
          zoomIn: '확대',
          zoomOut: '축소',
          pan: '이동',
          reset: '원래대로'
        }
      }
    }],
    defaultLocale: 'ko',
    toolbar: { 
      show: true,
      tools: {
        download: false,
        selection: false,
        zoom: true,
        zoomin: true,
        zoomout: true,
        pan: true,
        reset: true
      },
      autoSelected: 'zoom'
    },
    zoom: {
      enabled: true,
      type: 'x',
      autoScaleYaxis: true
    },
    sparkline: { enabled: false },
    background: 'transparent',
    fontFamily: 'Pretendard, Inter, sans-serif'
  },
  dataLabels: {
    enabled: false
  },
  plotOptions: {
    candlestick: {
      colors: {
        upward: '#ef4444',
        downward: '#3b82f6'
      },
      wick: {
        useFillColor: true
      }
    }
  },
  grid: {
    show: true,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    strokeDashArray: 4,
    padding: { left: -10, right: 0, top: 0, bottom: 0 }
  },
  xaxis: {
    type: 'datetime',
    labels: { 
      show: false // 상단 차트에서는 X축 라벨 숨김 (하단 거래량 차트에만 표시)
    },
    axisBorder: { show: false },
    axisTicks: { show: false },
    crosshairs: {
      show: true,
      position: 'back',
      stroke: {
        color: '#6366f1',
        width: 1,
        dashArray: 4,
      },
    }
  },
  yaxis: {
    show: true,
    opposite: true,
    labels: {
      style: {
        colors: '#64748b',
        fontSize: '10px',
        fontWeight: 600
      },
      formatter: (val: number) => {
        if (val >= 100000000) return (val / 100000000).toLocaleString() + '억'
        if (val >= 10000) return (val / 10000).toLocaleString() + '만'
        if (val >= 1000) return (val / 1000).toLocaleString() + '천'
        return val.toLocaleString()
      },
      minWidth: 65, // Y축 너비 고정하여 하단 차트와 완벽 매칭
      maxWidth: 65
    }
  },
  tooltip: {
    theme: 'dark',
    x: { format: 'MM월 dd일' },
    y: {
      title: {
        formatter: (seriesName) => {
          if (seriesName === 'Open') return '시가'
          if (seriesName === 'High') return '고가'
          if (seriesName === 'Low') return '저가'
          if (seriesName === 'Close') return '종가'
          return seriesName
        }
      }
    },
    style: {
      fontSize: '10px'
    }
  },
  annotations: chartAnnotations.value
}))

const volumeChartOptions = computed(() => ({
  chart: {
    id: 'stock-volume',
    group: 'stock-charts',
    type: 'bar',
    toolbar: { show: false },
    sparkline: { enabled: false },
    background: 'transparent',
    fontFamily: 'Pretendard, Inter, sans-serif'
  },
  dataLabels: {
    enabled: false
  },
  plotOptions: {
    bar: {
      columnWidth: '80%',
      colors: {
        ranges: [
          { from: 0, to: 0, color: undefined }
        ]
      }
    }
  },
  grid: {
    show: true,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    strokeDashArray: 4,
    padding: { left: -10, right: 0, top: 0, bottom: 0 }
  },
  xaxis: {
    type: 'datetime',
    labels: { 
      show: true,
      style: {
        colors: '#64748b',
        fontSize: '10px',
        fontWeight: 600
      },
      datetimeFormatter: {
         year: 'yyyy',
         month: 'MMM \'yy',
         day: 'dd MMM',
         hour: 'HH:mm'
      }
    },
    axisBorder: { show: false },
    axisTicks: { show: false },
    crosshairs: {
      show: true,
      position: 'back',
      stroke: {
        color: '#6366f1',
        width: 1,
        dashArray: 4,
      },
    }
  },
  yaxis: {
    show: true,
    opposite: true,
    labels: {
      style: {
        colors: '#64748b',
        fontSize: '10px',
        fontWeight: 600
      },
      formatter: (val: number) => {
        if (val >= 100000000) return (val / 100000000).toFixed(1) + '억'
        if (val >= 10000) return (val / 10000).toFixed(0) + '만'
        if (val >= 1000) return (val / 1000).toFixed(0) + '천'
        return val.toString()
      },
      minWidth: 65, // Y축 너비 고정하여 상단 차트와 완벽 매칭
      maxWidth: 65
    }
  },
  tooltip: {
    theme: 'dark',
    x: { format: 'MM월 dd일' },
    y: {
      title: {
        formatter: (seriesName) => {
          if (seriesName === 'Volume' || seriesName === '거래량') return '거래량'
          return seriesName
        }
      }
    },
    style: {
      fontSize: '10px'
    }
  }
}))

onMounted(async () => {
  // 1. SSR 데이터가 있으면 즉시 반영
  if (ssrStock.value) {
    stock.value = ssrStock.value
  }

  // 2. 종목 정보가 없다면 가져오기
  if (!stock.value) {
    const stockData = await fetchStockByCode(code)
    if (stockData) {
      stock.value = stockData
    }
  }
  
  // 최종적으로 데이터가 없는 경우에만 알림 (잠시 대기 후 확인)
  if (!stock.value) {
    console.warn(`[StockDetail] Stock data not found for code: ${code}`)
    alert('종목 정보를 찾을 수 없습니다.')
    router.back()
    return
  }
  
  // 3. 관련 데이터(이력, 찜, 뉴스, AI이력)를 병렬로 로드
  await Promise.all([
    fetchPriceHistory(stock.value.id, 50).then(data => priceHistory.value = data),
    fetchWishlist(),
    loadStockContent(),
    loadAiHistory()
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
  animation: fade-in 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ApexCharts Toolbar Styling */
:deep(.apexcharts-toolbar) {
  top: -38px !important;
  right: -10px !important;
  padding: 2px !important;
  background: transparent !important; /* 회색 덮개를 제거하기 위해 완전 투명화 */
  border: none !important; /* 테두리 제거 */
  backdrop-filter: none !important; /* 블러 필터 제거 */
  box-shadow: none !important;
}

:deep(.apexcharts-toolbar svg) {
  fill: #64748b !important; /* slate-500 으로 더 조화롭게 변경 */
  transform: scale(0.85) !important;
}

:deep(.apexcharts-toolbar svg:hover) {
  fill: #ef4444 !important; /* 선명한 상승 빨간색으로 호버 피드백 변경 */
}

:deep(.apexcharts-xcrosshairs), :deep(.apexcharts-ycrosshairs) {
  stroke: #6366f1 !important;
}
</style>
