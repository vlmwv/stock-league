<template>
  <div class="min-h-screen bg-bg-deep pb-12 overflow-x-hidden">
    <div class="max-w-md mx-auto relative">
      <!-- 상단 액션 바 -->
      <nav class="sticky top-0 z-40 px-6 py-4 flex items-center justify-between bg-bg-deep/80 backdrop-blur-xl">
        <button @click="router.back()" class="w-10 h-10 rounded-2xl bg-slate-800/50 flex items-center justify-center text-slate-400 hover:text-slate-100 transition-colors">
          <UIcon name="i-heroicons-chevron-left-20-solid" class="w-6 h-6" />
        </button>
        <div class="flex items-center gap-2">
           <button
            v-if="stock"
            @click="handleToggleHeart(stock.id)"
            class="w-10 h-10 rounded-2xl flex items-center justify-center transition-colors"
            :class="isHearted(stock.id) ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-800/50 text-slate-600 hover:text-slate-400'"
          >
            <UIcon :name="isHearted(stock.id) ? 'i-heroicons-heart-20-solid' : 'i-heroicons-heart'" class="w-5 h-5" />
          </button>
        </div>
      </nav>

      <main v-if="stock" class="px-6 space-y-8 animate-fade-in">
        <!-- 종목 헤더 -->
        <header>
          <div class="flex items-baseline gap-2 mb-1">
            <h1 class="text-3xl font-black text-slate-100 tracking-tight">{{ stock.name }}</h1>
            <span class="text-xs font-bold text-slate-500 uppercase tracking-widest">{{ stock.code }}</span>
          </div>
          <p class="text-sm text-slate-400 font-medium opacity-80 mt-1">{{ stock.sector || '주요 종목' }}</p>
          
          <div class="mt-6 flex flex-col gap-1">
            <div class="text-4xl font-black text-slate-100 flex items-baseline gap-1">
              {{ stock.last_price?.toLocaleString() }}
              <span class="text-base font-bold text-slate-500">원</span>
            </div>
            <div class="flex items-center gap-2 font-black text-sm" :class="stock.change_amount >= 0 ? 'text-rose-400' : 'text-indigo-400'">
              <span>{{ stock.change_amount >= 0 ? '▲' : '▼' }} {{ Math.abs(stock.change_amount).toLocaleString() }}</span>
              <span class="w-1 h-1 rounded-full bg-slate-700"></span>
              <span>{{ stock.change_amount >= 0 ? '+' : '' }}{{ stock.change_rate }}%</span>
            </div>
          </div>
        </header>

        <!-- 차트 섹션 (이력 탭에서만 보일지 고민하다가, 공통 정보로 상단에 작게 배치하거나 이력 탭에만 넣기로 함. 여기서는 상단 유지) -->
        <section class="glass-dark rounded-[2.5rem] p-6 border border-white/5 relative overflow-hidden">
          <div class="flex items-center justify-between mb-8">
            <h3 class="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Price Chart</h3>
            <div class="px-3 py-1 bg-slate-800/50 rounded-full border border-white/5 text-[10px] font-black text-slate-400">
              최근 30일
            </div>
          </div>
          
          <div v-if="chartSeries.length > 0" class="min-h-[220px]">
            <client-only>
              <apexchart
                type="area"
                height="220"
                :options="chartOptions"
                :series="chartSeries"
              />
            </client-only>
          </div>
          <div v-else class="h-[220px] flex items-center justify-center text-slate-600 text-sm font-bold italic">
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
          <div class="glass-dark rounded-2xl p-4 border border-white/5 flex flex-col justify-between">
            <p class="text-[9px] font-black text-slate-500 uppercase tracking-[0.1em] mb-2">AI 추천</p>
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
            <h3 class="text-xs font-black text-slate-400 uppercase tracking-[0.2em] px-2">Price History</h3>
            <div class="space-y-3">
              <div v-for="item in priceHistory" :key="item.price_date" class="glass-dark rounded-2xl p-4 border border-white/5 flex items-center justify-between">
                <div>
                  <p class="text-xs font-bold text-slate-200">{{ formatPriceDate(item.price_date) }}</p>
                  <p class="text-[10px] text-slate-500 mt-0.5">{{ item.price_date }}</p>
                </div>
                <div class="text-right">
                  <p class="text-sm font-black text-slate-200">{{ item.close_price?.toLocaleString() }}</p>
                  <p class="text-[10px] font-black" :class="item.change_amount >= 0 ? 'text-rose-400' : 'text-indigo-400'">
                    {{ item.change_amount >= 0 ? '+' : '' }}{{ item.change_rate }}%
                  </p>
                </div>
              </div>
              
              <div v-if="priceHistory.length === 0" class="py-12 text-center">
                <p class="text-sm text-slate-600 font-medium italic">가격 기록이 없습니다.</p>
              </div>
            </div>
          </div>

          <!-- 탭 콘텐츠: 종목 뉴스 / IR 공시 -->
          <div v-else class="space-y-4 animate-fade-in">
            <div v-if="isNewsLoading" class="flex flex-col items-center justify-center py-12 gap-4">
              <div class="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
              <p class="text-[10px] text-slate-500 font-black uppercase tracking-widest animate-pulse">데이터 로드 중...</p>
            </div>
            
            <div v-else-if="currentNewsItems.length === 0" class="py-20 text-center flex flex-col items-center justify-center glass-dark rounded-3xl border border-dashed border-white/10">
              <UIcon :name="activeTab === 'news' ? 'i-heroicons-newspaper' : 'i-heroicons-presentation-chart-line'" class="w-12 h-12 text-slate-800 mb-4" />
              <p class="text-sm text-slate-600 font-medium italic">등록된 {{ activeTab === 'news' ? '뉴스' : 'IR/공시' }}가 없습니다.</p>
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
                      <div 
                        class="w-8 h-8 rounded-lg flex items-center justify-center border shadow-sm"
                        :class="{
                          'bg-purple-500/10 border-purple-500/20 text-purple-400': item.type === 'ir',
                          'bg-brand-primary/10 border-brand-primary/20 text-brand-primary': item.type === 'news' || !item.type
                        }"
                      >
                        <UIcon 
                          :name="item.type === 'ir' ? 'i-heroicons-presentation-chart-line' : 'i-heroicons-newspaper'" 
                          class="w-4.5 h-4.5" 
                        />
                      </div>
                      <span class="text-[10px] text-slate-400 font-black uppercase tracking-widest">{{ item.source }}</span>
                    </div>
                    <span class="text-[10px] text-slate-500 font-bold opacity-70">{{ formatNewsDate(item.published_at) }}</span>
                  </div>

                  <h4 class="font-bold text-slate-100 text-[15px] leading-snug group-hover:text-brand-primary transition-colors line-clamp-2">
                    {{ item.title }}
                  </h4>

                  <div v-if="item.llm_summary" class="bg-indigo-500/[0.04] rounded-xl p-3.5 border border-white/5">
                    <p class="text-[11px] text-slate-400 leading-relaxed font-medium">
                      <span class="text-brand-primary/80 font-black mr-1.5 uppercase text-[9px]">AI Summary</span>
                      {{ item.llm_summary }}
                    </p>
                  </div>
                </div>
                <div class="absolute -bottom-10 -right-10 w-24 h-24 bg-brand-secondary/5 blur-[40px] rounded-full group-hover:bg-brand-secondary/10 transition-colors"></div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <!-- 로딩 상태 -->
      <div v-else class="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div class="w-10 h-10 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
        <p class="text-sm text-slate-500 font-bold animate-pulse uppercase tracking-widest">Loading Stock Info...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { repairNewsUrl } from '~/utils/stock'

const route = useRoute()
const router = useRouter()
const { fetchStockByCode, fetchPriceHistory, fetchNews, hearts, toggleHeart, fetchWishlist } = useStock()

const code = route.params.code as string

const stock = ref<any>(null)
const priceHistory = ref<any[]>([])
const activeTab = ref('history')
const tabs = [
  { key: 'history', label: '주가 이력' },
  { key: 'news', label: '종목 뉴스' },
  { key: 'ir', label: '종목 IR' }
]

const newsItems = ref<any[]>([])
const irItems = ref<any[]>([])
const isNewsLoading = ref(false)

// 현재 탭에 따른 뉴스 아이템 반환
const currentNewsItems = computed(() => {
  return activeTab.value === 'news' ? newsItems.value : irItems.value
})

// SSR 단계에서 종목 정보 로드
const { data: ssrStock } = await useAsyncData<any>(`stock-seo-${code}`, () => fetchStockByCode(code))
if (ssrStock.value) {
  const title = `[${ssrStock.value.name}] 주식예측게임`
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

const handleToggleHeart = async (stockId: number) => {
  await toggleHeart(stockId)
}

const navigateToNews = (item: any) => {
  const url = repairNewsUrl(item.url, item.stockCode, item.type)
  if (url) {
    window.open(url, '_blank')
  }
}

// 뉴스/IR 로드 함수
const loadStockContent = async () => {
  if (!stock.value) return
  isNewsLoading.value = true
  try {
    const [newsRes, irRes] = await Promise.all([
      fetchNews(20, 1, 'news', stock.value.id),
      fetchNews(20, 1, 'ir', stock.value.id)
    ])
    newsItems.value = newsRes.data
    irItems.value = irRes.data
  } finally {
    isNewsLoading.value = false
  }
}

const chartSeries = computed(() => {
  if (priceHistory.value.length === 0) return []
  const dataForChart = [...priceHistory.value].reverse()
  return [{
    name: '종가',
    data: dataForChart.map(h => ({
      x: h.price_date,
      y: h.close_price
    }))
  }]
})

const chartOptions = computed(() => ({
  chart: {
    type: 'area',
    toolbar: { show: false },
    sparkline: { enabled: false },
    background: 'transparent',
    fontFamily: 'Pretendard, Inter, sans-serif'
  },
  colors: ['#6366f1'],
  fill: {
    type: 'gradient',
    gradient: {
      shadeIntensity: 1,
      opacityFrom: 0.6,
      opacityTo: 0.1,
      stops: [0, 100]
    }
  },
  stroke: {
    curve: 'smooth',
    width: 3,
    lineCap: 'round'
  },
  grid: {
    show: false,
    padding: { left: -10, right: 0, top: 0, bottom: 0 }
  },
  xaxis: {
    type: 'datetime',
    labels: { show: false },
    axisBorder: { show: false },
    axisTicks: { show: false }
  },
  yaxis: {
    show: false
  },
  tooltip: {
    theme: 'dark',
    x: { format: 'MM월 dd일' },
    y: {
      formatter: (val: number) => val.toLocaleString() + '원'
    },
    style: {
      fontSize: '10px'
    }
  },
  markers: {
    size: 0,
    hover: { size: 5 }
  }
}))

onMounted(async () => {
  const stockData = await fetchStockByCode(code)
  
  if (!stockData) {
    alert('존재하지 않는 종목입니다.')
    router.back()
    return
  }
  
  stock.value = stockData
  
  const [historyData] = await Promise.all([
    fetchPriceHistory(stock.value.id),
    fetchWishlist(),
    loadStockContent()
  ])
  
  priceHistory.value = historyData
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
</style>
