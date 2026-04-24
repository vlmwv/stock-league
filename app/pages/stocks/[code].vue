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
            v-if="user && role === 'admin'"
            @click="isAdminModalOpen = true"
            class="px-4 h-10 rounded-2xl bg-brand-primary text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-brand-primary/20 hover:shadow-brand-primary/40 transition-all flex items-center gap-2"
          >
            <UIcon name="i-heroicons-sparkles" class="w-4 h-4" />
            추천하기
          </button>
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

      <AdminStockActionModal
        v-if="stock"
        v-model:open="isAdminModalOpen"
        :stock-id="stock.id"
        :stock-name="stock.name"
        :stock-code="stock.code"
        :last-price="stock.last_price"
        @success="handleAdminSuccess"
      />

      <main v-if="stock" class="px-5 space-y-5 animate-fade-in pb-16">
        <!-- 종목 헤더 (Brand CI 포함) -->
        <header class="flex items-center gap-4">
          <StockIcon :code="stock.code" :name="stock.name" size="lg" class="shadow-lg border border-white/5 flex-shrink-0" />
          <div class="flex-1 min-w-0">
            <!-- 1행: 종목명, 종목코드, 현재가 -->
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-baseline gap-2 min-w-0">
                <h1 class="text-xl font-black text-slate-100 tracking-tight truncate">{{ stock.name }}</h1>
                <span class="text-xs font-bold text-slate-500 flex-shrink-0">{{ stock.code }}</span>
              </div>
              <div class="text-xl font-black text-slate-100 whitespace-nowrap">{{ stock.last_price?.toLocaleString() }}</div>
            </div>
            
            <!-- 2행: 코스피/코스닥, 추천수, 금일변동금액(비율) -->
            <div class="flex items-center justify-between text-[11px] font-bold mt-1">
              <div class="flex items-center gap-2">
                <span class="text-slate-500">{{ stock.sector || 'KOSPI' }}</span>
                <div v-if="stock.ai_recommendation_count > 0" class="flex items-center gap-1 text-brand-primary">
                  <UIcon name="i-heroicons-hand-thumb-up-20-solid" class="w-3.5 h-3.5" />
                  <span>{{ stock.ai_recommendation_count }}회 추천</span>
                </div>
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
            <h3 class="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Price Chart</h3>
            <div class="px-3 py-1 bg-slate-800/50 rounded-full border border-white/5 text-[10px] font-black text-slate-400">
              최근 100일
            </div>
          </div>
          
          <div v-if="chartSeries.length > 0" class="min-h-[220px]">
            <client-only>
              <apexchart
                :key="`chart-${chartSeries.length}-${chartAnnotations.xaxis.length}-${chartAnnotations.yaxis.length}`"
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
                      <span class="text-brand-primary/80 font-black mr-1.5 uppercase text-[9px]">AI Summary</span>
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
        <p class="text-sm text-slate-500 font-bold animate-pulse uppercase tracking-widest">Loading Stock Info...</p>
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
  wishlistsWithGroups,
  fetchUserStats
} = useStock()

const user = useSupabaseUser()
const role = ref('user')
const isAdminModalOpen = ref(false)

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

const handleToggleHeart = () => {
  isGroupModalOpen.value = true
}

const handleAdminSuccess = async () => {
  await Promise.all([
    loadAiHistory(),
    fetchStockByCode(code).then(data => { if (data) stock.value = data })
  ])
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
    name: '종가',
    data: dataForChart.map(h => ({
      x: h.price_date,
      y: h.close_price
    }))
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

  return ann
})

const chartOptions = computed(() => ({
  chart: {
    type: 'area',
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
      formatter: (val: number) => val >= 1000 ? (val / 1000).toLocaleString() + 'k' : val.toLocaleString()
    }
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
  },
  annotations: chartAnnotations.value
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
    fetchPriceHistory(stock.value.id).then(data => priceHistory.value = data),
    fetchWishlist(),
    loadStockContent(),
    loadAiHistory(),
    fetchUserStats().then(stats => {
      if (stats) role.value = stats.role
    })
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
  padding: 4px 6px !important;
  background: rgba(15, 23, 42, 0.4) !important;
  border-radius: 12px !important;
  border: 1px solid rgba(255, 255, 255, 0.05) !important;
  backdrop-filter: blur(8px) !important;
}

:deep(.apexcharts-toolbar svg) {
  fill: #94a3b8 !important; /* slate-400 */
  transform: scale(0.85) !important;
}

:deep(.apexcharts-toolbar svg:hover) {
  fill: #6366f1 !important; /* indigo-500 */
}

:deep(.apexcharts-xcrosshairs), :deep(.apexcharts-ycrosshairs) {
  stroke: #6366f1 !important;
}
</style>
